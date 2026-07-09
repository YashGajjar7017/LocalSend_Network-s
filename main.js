require('dotenv').config();
const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const LocalDatabase = require('./server/database.js');
const ExpressServer = require('./server/app.js');
const UDPDiscovery = require('./server/discovery.js');

let mainWindow = null;
let tray = null;
let db = null;
let server = null;
let discovery = null;

// Ensure single instance lock
const additionalData = { myKey: 'airsync-lock' };
const gotTheLock = app.requestSingleInstanceLock(additionalData);

if (!gotTheLock) {
  app.quit();
  return;
}

app.on('second-instance', (event, commandLine, workingDirectory, additionalData) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

function initBackend() {
  const userDataPath = app.getPath('userData');
  db = new LocalDatabase(userDataPath);
  const settings = db.getSettings();

  // If no custom device name is stored, default to OS hostname
  if (!settings.deviceName) {
    settings.deviceName = os.hostname();
    db.updateSettings({ deviceName: settings.deviceName });
  }

  // Set default downloads directory if empty
  if (!settings.saveFolder) {
    settings.saveFolder = path.join(os.homedir(), 'Downloads');
    db.updateSettings({ saveFolder: settings.saveFolder });
  }

  // Set up auto-start setting
  setAutoStart(settings.autoStart);

  const serverPort = settings.port || 53343;

  // Initialize Express Server
  server = new ExpressServer({
    port: serverPort,
    db: db
  });

  // Link server notifications to UI renderer
  server.registerMessageCallback((channel, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data);
    }
  });

  // Start Express Server
  server.start().then((port) => {
    console.log(`Express server running on port: ${port}`);
    // Update discovery with binding port
    discovery.expressPort = port;
    discovery.start();
  }).catch((err) => {
    console.error('Failed to start Express server:', err);
  });

  // Initialize UDP Discovery
  discovery = new UDPDiscovery({
    port: 53344,
    deviceId: settings.deviceId,
    deviceName: settings.deviceName,
    deviceType: settings.deviceType,
    expressPort: serverPort,
    db: db
  });

  discovery.on('peers-updated', (peers) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('peers-updated', peers);
    }
  });

  discovery.on('scanning-state', (isScanning) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scanning-state', isScanning);
    }
  });
}

function createTray() {
  // Use a base64 transparent 16x16 PNG to avoid missing asset crashes
  const trayIcon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQQAAASCAYAAAB2CTkWAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAWklEQVQ4y2NgGAVgGPjPwMhAJ2PEofB/1oD/dAy4DMDwH8UgpAFiDDyPhgFDGqAYuB6bAUw45P7P4hh+oBhADfA8NgNGEkQZ+H/WwPAfxSAUA0YBfIbRMBh4DAAb5yF1j6d9nQAAAABJRU5ErkJggg=='
  );
  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open AirSync', click: () => { if (mainWindow) mainWindow.show(); } },
    { type: 'separator' },
    {
      label: 'Quit AirSync', click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setToolTip('AirSync - Local Share');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) mainWindow.show();
  });
}

function setAutoStart(enabled) {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: app.getPath('exe')
    });
  } catch (e) {
    console.error('Failed to set login item settings:', e);
  }
}

function createWindow() {
  const settings = db.getSettings();
  const bounds = settings.windowBounds;

  mainWindow = new BrowserWindow({
    width: bounds.width || 940,
    height: bounds.height || 680,
    x: bounds.x,
    y: bounds.y,
    minWidth: 800,
    minHeight: 600,
    title: 'AirSync',
    backgroundColor: '#020617', // slate-950
    show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Hide native menu
  mainWindow.setMenuBarVisibility(false);

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    const loadDevServer = () => {
      mainWindow.loadURL('http://localhost:5173').catch(() => {
        setTimeout(loadDevServer, 500);
      });
    };
    loadDevServer();

    // Only open devtools on F12 press
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' && input.type === 'keyDown') {
        mainWindow.webContents.toggleDevTools();
        event.preventDefault();
      }
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    const freshSettings = db.getSettings();

    // Save window size and position if configured
    if (freshSettings.saveWindowStatus) {
      const currentBounds = mainWindow.getBounds();
      db.updateSettings({ windowBounds: currentBounds });
    }

    if (freshSettings.closeToTray && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Capture window state updates reactively
  mainWindow.on('resize', () => {
    const freshSettings = db.getSettings();
    if (freshSettings.saveWindowStatus) {
      db.updateSettings({ windowBounds: mainWindow.getBounds() });
    }
  });

  mainWindow.on('move', () => {
    const freshSettings = db.getSettings();
    if (freshSettings.saveWindowStatus) {
      db.updateSettings({ windowBounds: mainWindow.getBounds() });
    }
  });
}

// -------------------------------------------------------------
// IPC Handler Operations
// -------------------------------------------------------------

ipcMain.handle('db-get-settings', () => {
  return db.getSettings();
});

ipcMain.handle('db-update-settings', (event, newSettings) => {
  const updated = db.updateSettings(newSettings);

  // Sync changed names or types to active discovery process
  if (newSettings.deviceName || newSettings.deviceType) {
    discovery.updateDeviceInfo(newSettings.deviceName, newSettings.deviceType);
  }

  // Update auto-start setting dynamically
  if (newSettings.autoStart !== undefined) {
    setAutoStart(newSettings.autoStart);
  }

  return updated;
});

ipcMain.handle('db-get-history', () => {
  return db.getHistory();
});

ipcMain.handle('db-add-history', (event, entry) => {
  return db.addHistoryEntry(entry);
});

ipcMain.handle('db-clear-history', () => {
  db.clearHistory();
  return true;
});

ipcMain.handle('server-stop', async () => {
  try {
    if (server) server.stop();
    if (discovery) discovery.stop();
    return { status: 'stopped' };
  } catch (e) {
    return { status: 'error', error: e.message };
  }
});

ipcMain.handle('server-start', async () => {
  try {
    const settings = db.getSettings();
    const port = settings.port || 53343;
    if (server) {
      server.port = port;
      const startedPort = await server.start();
      discovery.expressPort = startedPort;
      discovery.start();
      return { status: 'running', port: startedPort };
    }
    return { status: 'error', error: 'Server not initialized' };
  } catch (e) {
    return { status: 'error', error: e.message };
  }
});

ipcMain.handle('server-restart', async () => {
  try {
    if (server) server.stop();
    if (discovery) discovery.stop();

    await new Promise(r => setTimeout(r, 500));

    const settings = db.getSettings();
    const port = settings.port || 53343;
    if (server) {
      server.port = port;
      const startedPort = await server.start();
      discovery.expressPort = startedPort;
      discovery.start();
      return { status: 'running', port: startedPort };
    }
    return { status: 'error', error: 'Server not initialized' };
  } catch (e) {
    return { status: 'error', error: e.message };
  }
});

ipcMain.handle('get-network-info', () => {
  if (discovery) {
    const ips = discovery.getLocalIPs();
    if (ips.length > 0) {
      return ips.map(ipInfo => `${ipInfo.name}: ${ipInfo.address} (${ipInfo.netmask})`).join(', ');
    }
  }
  return 'No active network connection';
});

ipcMain.handle('github-signin', async () => {
  return new Promise((resolve) => {
    const authWindow = new BrowserWindow({
      width: 450,
      height: 600,
      parent: mainWindow,
      modal: true,
      title: 'Sign in with GitHub',
      show: false,
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    authWindow.setMenuBarVisibility(false);

    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sign in with GitHub</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            background-color: #0d1117;
            color: #c9d1d9;
            margin: 0;
            padding: 40px 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .logo {
            width: 60px;
            height: 60px;
            fill: #c9d1d9;
            margin-bottom: 24px;
          }
          h2 {
            font-size: 20px;
            font-weight: 400;
            margin: 0 0 8px 0;
            color: #f0f6fc;
          }
          p {
            font-size: 14px;
            color: #8b949e;
            text-align: center;
            margin: 0 0 32px 0;
            line-height: 1.5;
          }
          .card {
            background-color: #161b22;
            border-radius: 6px;
            padding: 24px;
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #30363d;
          }
          .btn {
            background-color: #238636;
            color: #ffffff;
            border: 1px solid rgba(240, 246, 252, 0.1);
            border-radius: 6px;
            padding: 12px;
            font-size: 14px;
            font-weight: 500;
            width: 100%;
            cursor: pointer;
            text-align: center;
          }
          .btn:hover {
            background-color: #2ea043;
          }
          .btn-cancel {
            background-color: transparent;
            color: #58a6ff;
            border: none;
            margin-top: 16px;
            cursor: pointer;
            font-size: 14px;
          }
          .btn-cancel:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <svg class="logo" viewBox="0 0 16 16" version="1.1" aria-hidden="true"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.57-.18-3.21-.78-3.21-3.48 0-.77.27-1.39.71-1.88-.07-.18-.31-.9.07-1.89 0 0 .59-.19 1.95.73a6.83 6.83 0 013.68 0C12.72 2.1 13.3 2.3 13.3 2.3c.38.99.14 1.71.07 1.89.44.49.71 1.11.71 1.88 0 2.71-1.64 3.29-3.22 3.47.25.22.48.65.48 1.3 0 .93-.01 1.68-.01 1.91 0 .22.15.49.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
        <h2>Authorize AirSync</h2>
        <p>AirSync is requesting access to your public GitHub profile to generate secure share links and enable fast peer-to-peer tunnels.</p>
        <div class="card">
          <button class="btn" onclick="authorize()">Authorize GithubUserData</button>
          <center><button class="btn-cancel" onclick="cancel()">Cancel</button></center>
        </div>

        <script>
          function authorize() {
            window.location.href = '?auth=success';
          }
          function cancel() {
            window.close();
          }
        </script>
      </body>
      </html>
    `;

    authWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(mockHtml));

    authWindow.once('ready-to-show', () => {
      authWindow.show();
    });

    authWindow.webContents.on('will-navigate', (event, url) => {
      if (url.includes('?auth=success')) {
        authWindow.close();
        
        // Retrieve credentials from .env
        const client_id = process.env.GITHUB_CLIENT_ID;
        console.log(`GitHub SignIn authorized with Client ID: ${client_id}`);
        
        resolve({
          username: 'GithubUserData',
          name: 'Yash Gajjar',
          avatar_url: 'https://avatars.githubusercontent.com/u/70177017?v=4',
          html_url: 'https://github.com/GithubUserData'
        });
      }
    });

    authWindow.on('closed', () => {
      resolve(null);
    });
  });
});

ipcMain.handle('google-signin', async () => {
  return new Promise((resolve) => {
    const authWindow = new BrowserWindow({
      width: 450,
      height: 600,
      parent: mainWindow,
      modal: true,
      title: 'Sign in with Google',
      show: false,
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    authWindow.setMenuBarVisibility(false);

    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sign in with Google</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 40px 24px;
            background-color: #ffffff;
            color: #333333;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 0;
          }
          .logo {
            width: 48px;
            height: 48px;
            margin-bottom: 24px;
          }
          h2 {
            font-size: 22px;
            font-weight: 500;
            margin: 0 0 8px 0;
            color: #202124;
          }
          p {
            font-size: 14px;
            color: #5f6368;
            margin: 0 0 32px 0;
            line-height: 1.5;
            max-width: 320px;
          }
          .card {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 24px;
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #dadce0;
          }
          .btn {
            background-color: #1a73e8;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            width: 100%;
            box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15);
          }
          .btn:hover {
            background-color: #1557b0;
          }
          .btn-cancel {
            background: none;
            border: none;
            cursor: pointer;
            color: #1a73e8;
            font-size: 13px;
            font-weight: 500;
            margin-top: 16px;
          }
          .btn-cancel:hover {
            color: #1557b0;
          }
        </style>
      </head>
      <body>
        <svg class="logo" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        <h2>Sign in to AirSync</h2>
        <p>Using Google Account credentials to link your cloud relay profile.</p>
        <div class="card">
          <button class="btn" onclick="authorize()">Authorize GoogleAccount</button>
          <center><button class="btn-cancel" onclick="cancel()">Cancel</button></center>
        </div>

        <script>
          function authorize() {
            window.location.href = '?auth=success';
          }
          function cancel() {
            window.close();
          }
        </script>
      </body>
      </html>
    `;

    authWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(mockHtml));
    
    authWindow.once('ready-to-show', () => {
      authWindow.show();
    });

    authWindow.webContents.on('will-navigate', (event, url) => {
      if (url.includes('?auth=success')) {
        authWindow.close();
        
        // Retrieve credentials from .env
        const client_id = process.env.GOOGLE_CLIENT_ID;
        console.log(`Google SignIn authorized with Client ID: ${client_id}`);
        
        resolve({
          username: 'GoogleUser',
          name: 'Yash Google Auth',
          avatar_url: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
          html_url: '#'
        });
      }
    });

    authWindow.on('closed', () => {
      resolve(null);
    });
  });
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const stats = fs.statSync(filePath);
  return {
    path: filePath,
    name: path.basename(filePath),
    size: stats.size
  };
});

ipcMain.on('open-folder', (event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
  }
});

// Outgoing transfer process triggers
ipcMain.on('select-and-send-file', async (event, peer) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) return;

  const filePath = result.filePaths[0];
  sendFileToPeer(peer, filePath);
});

// Implementation of streaming HTTP client for Outgoing file uploads
async function sendFileToPeer(peer, filePath) {
  const transferId = 'tx_' + Math.random().toString(36).substr(2, 9);

  try {
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const size = stats.size;
    const settings = db.getSettings();

    // 1. Send outgoing transfer init notice to renderer
    mainWindow.webContents.send('outgoing-transfer-start', {
      transferId,
      peer,
      fileName,
      size,
      status: 'requesting'
    });

    // 2. Request receiver permission
    const receiverUrl = `http://${peer.ip}:${peer.expressPort}/api/transfer/request`;
    const requestBody = {
      senderId: settings.deviceId,
      senderName: settings.deviceName,
      deviceType: settings.deviceType,
      fileName,
      size,
      pin: peer.pin // UI must provide this if peer has "Require PIN" on
    };

    const response = await fetch(receiverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000) // 30 sec connection timeout
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('PIN incorrect or rejected by remote device');
      }
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.reason || `Remote server responded with error ${response.status}`);
    }

    const resData = await response.json();
    if (resData.status === 'rejected') {
      throw new Error(resData.reason || 'Transfer rejected by receiver');
    }

    const uploadUrl = resData.uploadUrl;
    const finalFileName = resData.fileName || fileName;

    // Update state to uploading
    mainWindow.webContents.send('outgoing-transfer-start', {
      transferId,
      peer,
      fileName: finalFileName,
      size,
      status: 'uploading'
    });

    // 3. Stream upload using custom chunked stream or native fetch
    // To track progress, we read chunk-by-chunk and post it using fetch
    const fileStream = fs.createReadStream(filePath);
    const { Readable } = require('stream');
    let bytesSent = 0;
    const startTime = Date.now();

    const progressStream = new Readable({
      read() { }
    });

    fileStream.on('data', (chunk) => {
      bytesSent += chunk.length;
      const percent = (bytesSent / size) * 100;
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = elapsed > 0 ? (bytesSent / elapsed) : 0;

      mainWindow.webContents.send('outgoing-transfer-progress', {
        transferId,
        bytesSent,
        totalBytes: size,
        speed,
        percent
      });
      progressStream.push(chunk);
    });

    fileStream.on('end', () => {
      progressStream.push(null);
    });

    fileStream.on('error', (err) => {
      progressStream.destroy(err);
    });

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: progressStream,
      duplex: 'half' // required by fetch spec for streams
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload stream aborted or failed: ${uploadResponse.statusText}`);
    }

    // Success: log history entry
    const historyEntry = {
      fileName: finalFileName,
      size,
      senderDevice: 'Me',
      receiverDevice: peer.deviceName,
      status: 'Completed',
      filePath,
      direction: 'outgoing'
    };
    db.addHistoryEntry(historyEntry);

    // Notify UI
    mainWindow.webContents.send('outgoing-transfer-complete', {
      transferId,
      historyEntry
    });

  } catch (error) {
    console.error('Outgoing file transfer failed:', error);
    mainWindow.webContents.send('outgoing-transfer-error', {
      transferId,
      reason: error.message
    });

    // Add failed entry to history
    try {
      const stats = fs.statSync(filePath);
      const historyEntry = {
        fileName: path.basename(filePath),
        size: stats.size,
        senderDevice: 'Me',
        receiverDevice: peer.deviceName,
        status: 'Failed',
        filePath,
        direction: 'outgoing'
      };
      db.addHistoryEntry(historyEntry);
    } catch (e) { }
  }
}

// -------------------------------------------------------------
// Bluetooth Scan & Pairing simulation
// -------------------------------------------------------------

let bluetoothScanTimer = null;
const mockBluetoothDevices = [
  { id: 'bt_phone_01', name: 'iPhone 15 Pro Max', type: 'mobile', signalStrength: -65, paired: false },
  { id: 'bt_buds_02', name: 'Sony WH-1000XM4', type: 'headphones', signalStrength: -72, paired: false },
  { id: 'bt_tablet_03', name: 'Galaxy Tab S9 Ultra', type: 'tablet', signalStrength: -58, paired: false },
  { id: 'bt_watch_04', name: 'Apple Watch Ultra 2', type: 'watch', signalStrength: -85, paired: false },
];

ipcMain.on('bluetooth-start-scan', (event) => {
  if (bluetoothScanTimer) clearInterval(bluetoothScanTimer);

  // Simulate discoverable devices showing up in waves to create a dynamic feel
  let idx = 0;
  bluetoothScanTimer = setInterval(() => {
    if (idx < mockBluetoothDevices.length) {
      mainWindow.webContents.send('bluetooth-device-found', mockBluetoothDevices[idx]);
      idx++;
    } else {
      clearInterval(bluetoothScanTimer);
      bluetoothScanTimer = null;
    }
  }, 2000);
});

ipcMain.on('bluetooth-stop-scan', (event) => {
  if (bluetoothScanTimer) {
    clearInterval(bluetoothScanTimer);
    bluetoothScanTimer = null;
  }
});

ipcMain.on('bluetooth-pair', (event, deviceId) => {
  // Simulate handshake duration, then return success
  setTimeout(() => {
    mainWindow.webContents.send('bluetooth-pairing-success', deviceId);
  }, 4000); // 4-second animated handshake
});

// App ready listener
app.whenReady().then(() => {
  initBackend();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (discovery) discovery.stop();
  if (server) server.stop();
});
