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

  // Initialize Express Server
  server = new ExpressServer({
    port: 53343,
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
    expressPort: 53343
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
    { label: 'Quit AirSync', click: () => {
      app.isQuitting = true;
      app.quit();
    }}
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

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled) return null;
  return result.filePaths[0];
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
      read() {}
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
    } catch (e) {}
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
