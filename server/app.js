const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { ipcMain } = require('electron');

class ExpressServer {
  constructor(options = {}) {
    this.port = options.port || 53343;
    this.db = options.db; // Instance of LocalDatabase
    this.app = express();
    this.serverInstance = null;
    this.pendingTransfers = new Map(); // key: transferId, value: { res, fileDetails }
    this.activeUploads = new Map();     // key: transferId, value: { writeStream, bytesReceived, totalBytes, startTime }
    this.portalSharedFiles = new Map(); // key: fileId, value: { id, name, size, path }

    this.initMiddlewares();
    this.initRoutes();
    this.initIPCHandlers();
  }

  initMiddlewares() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  initRoutes() {
    // 1. Get info about this device
    this.app.get('/api/device-info', (req, res) => {
      const settings = this.db.getSettings();
      res.json({
        deviceName: settings.deviceName || 'Local Device',
        deviceType: settings.deviceType || 'desktop',
        deviceId: settings.deviceId || 'local'
      });
    });

    // 2. Request a file transfer
    this.app.post('/api/transfer/request', (req, res) => {
      const { senderId, senderName, deviceType, fileName, size, pin, isLinkShare, encrypted, key, iv } = req.body;
      const settings = this.db.getSettings();

      const isFavorite = settings.favorites.includes(senderId);
      const shouldAutoAccept = settings.quickSave || 
                               (settings.quickSaveFavorites && isFavorite) ||
                               (settings.shareViaLinkAutoAccept && isLinkShare);

      // Check PIN authentication if enabled (bypass if auto-accepted via link share)
      if (settings.requirePin && !shouldAutoAccept) {
        if (!pin || pin !== settings.pinCode) {
          return res.status(403).json({ status: 'rejected', reason: 'Invalid PIN' });
        }
      }

      const transferId = 'tx_' + Math.random().toString(36).substr(2, 9);
      
      const fileDetails = {
        transferId,
        senderId,
        senderName,
        deviceType,
        fileName,
        size: parseInt(size, 10),
        isFavorite,
        timestamp: Date.now(),
        encrypted: !!encrypted,
        key: key || null,
        iv: iv || null,
        host: req.headers.host || `localhost:${this.port}`
      };

      if (shouldAutoAccept) {
        // Auto-accept
        setTimeout(() => {
          this.respondToRequest(transferId, true, fileDetails, res);
        }, 100);
        return;
      }

      // Put request in pending
      const timeout = setTimeout(() => {
        if (this.pendingTransfers.has(transferId)) {
          this.pendingTransfers.delete(transferId);
          res.status(408).json({ status: 'rejected', reason: 'Request timed out' });
          // Notify renderer of timeout
          this.notifyRenderer('transfer-timeout', { transferId });
        }
      }, 30000); // 30 second timeout

      this.pendingTransfers.set(transferId, { res, fileDetails, timeout });

      // Notify the Electron Main window to display the dialog
      this.notifyRenderer('incoming-transfer-request', fileDetails);
    });

    // 3. Upload/Stream the file
    this.app.post('/api/transfer/upload', (req, res) => {
      const { transferId } = req.query;
      
      if (!transferId || !this.activeUploads.has(transferId)) {
        return res.status(400).json({ status: 'error', reason: 'Invalid or unauthorized upload session' });
      }

      const session = this.activeUploads.get(transferId);
      const { targetPath, totalBytes, encrypted, key, iv } = session;
      
      const writeStream = fs.createWriteStream(targetPath);
      session.writeStream = writeStream;
      session.startTime = Date.now();

      const crypto = require('crypto');
      let decipher = null;
      if (encrypted && key && iv) {
        try {
          decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
        } catch (err) {
          console.error('Failed to create decipher:', err);
        }
      }

      if (decipher) {
        decipher.on('error', (err) => {
          console.error('Decryption stream error:', err);
          writeStream.destroy(err);
        });
        req.pipe(decipher).pipe(writeStream);
      } else {
        req.pipe(writeStream);
      }

      req.on('data', (chunk) => {
        session.bytesReceived += chunk.length;
        
        // Calculate speed & percentage
        const elapsed = (Date.now() - session.startTime) / 1000; // seconds
        const speed = elapsed > 0 ? (session.bytesReceived / elapsed) : 0; // bytes/sec
        const percent = Math.min((session.bytesReceived / totalBytes) * 100, 100);

        this.notifyRenderer('transfer-progress', {
          transferId,
          bytesReceived: session.bytesReceived,
          totalBytes,
          speed, // bytes/sec
          percent
        });
      });

      req.on('end', () => {
        writeStream.end();
      });

      writeStream.on('finish', () => {
        this.activeUploads.delete(transferId);
        
        // Add to history database
        const settings = this.db.getSettings();
        const historyEntry = {
          fileName: session.fileName,
          size: totalBytes,
          senderDevice: session.senderName,
          receiverDevice: 'Me',
          status: 'Completed',
          filePath: targetPath,
          direction: 'incoming'
        };
        
        this.db.addHistoryEntry(historyEntry);

        // Notify UI of completion
        this.notifyRenderer('transfer-complete', {
          transferId,
          filePath: targetPath,
          fileName: session.fileName,
          historyEntry
        });

        res.json({ status: 'completed' });
      });

      writeStream.on('error', (err) => {
        console.error('File write stream error:', err);
        this.activeUploads.delete(transferId);
        
        // Save failed to history
        const historyEntry = {
          fileName: session.fileName,
          size: totalBytes,
          senderDevice: session.senderName,
          receiverDevice: 'Me',
          status: 'Failed',
          filePath: targetPath,
          direction: 'incoming'
        };
        this.db.addHistoryEntry(historyEntry);

        this.notifyRenderer('transfer-error', {
          transferId,
          reason: 'Failed to write file: ' + err.message
        });

        res.status(500).json({ status: 'error', reason: err.message });
      });
    });

    // 4. GET /portal - Web Share Portal Page
    this.app.get('/portal', (req, res) => {
      const htmlPortal = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LocalNetwork Web Portal</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Outfit', sans-serif;
      background-color: #020617;
    }
  </style>
</head>
<body class="text-slate-100 min-h-screen flex flex-col justify-between p-4 md:p-8">
  <div class="max-w-3xl w-full mx-auto bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-8 mt-4 animate-fade-in">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-white/5 pb-6">
      <div>
        <h1 class="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">LocalNetwork Portal</h1>
        <p class="text-xs text-slate-400 mt-1">Shared by <span id="shared-by-name" class="font-semibold text-slate-300">...</span></p>
      </div>
      <div class="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
        Active Node
      </div>
    </div>

    <!-- Downloads Section -->
    <div class="space-y-4">
      <h2 class="text-sm font-bold text-slate-400 uppercase tracking-widest">Shared Files (Downloads)</h2>
      <div id="downloads-list" class="grid grid-cols-1 gap-3">
        <!-- Files will be injected here -->
      </div>
    </div>

    <!-- Upload Section -->
    <div class="space-y-4">
      <h2 class="text-sm font-bold text-slate-400 uppercase tracking-widest">Upload to LocalNetwork</h2>
      <div id="drop-zone" class="border-2 border-dashed border-white/10 hover:border-emerald-500/30 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 bg-slate-950/30">
        <svg class="w-8 h-8 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
        <span class="text-xs text-slate-300 font-semibold">Drag & Drop file here or click to select</span>
        <span class="text-[10px] text-slate-500 mt-1">Files are saved directly to the host's downloads directory</span>
        <input type="file" id="file-input" class="hidden">
      </div>
      <!-- Upload progress -->
      <div id="upload-progress" class="hidden bg-slate-950/50 border border-white/5 rounded-2xl p-4 space-y-2">
        <div class="flex justify-between text-xs font-mono">
          <span id="upload-filename" class="truncate text-slate-300 max-w-[200px]">Uploading...</span>
          <span id="upload-percent" class="text-emerald-400">0%</span>
        </div>
        <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
          <div id="upload-bar" class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-200" style="width: 0%"></div>
        </div>
      </div>
    </div>
  </div>

  <div class="text-center text-[10px] text-slate-600 mt-8">
    Powered by LocalNetwork Secure Sharing Protocol
  </div>

  <script>
    const API_BASE = window.location.origin;

    async function loadPortal() {
      try {
        const res = await fetch(\`\${API_BASE}/api/portal/files\`);
        const data = await res.json();
        
        document.getElementById('shared-by-name').textContent = data.deviceName;
        
        const list = document.getElementById('downloads-list');
        list.innerHTML = '';
        
        if (data.files.length === 0) {
          list.innerHTML = \`
            <div class="text-center text-xs text-slate-500 py-6 border border-dashed border-white/5 rounded-2xl">
              No files are shared on the portal at this moment.
            </div>
          \`;
          return;
        }

        data.files.forEach(file => {
          const item = document.createElement('div');
          item.className = 'flex items-center justify-between p-4 bg-slate-950/40 border border-white/5 rounded-2xl hover:bg-slate-950/60 transition-all';
          item.innerHTML = \`
            <div class="min-w-0 flex-1 pr-4">
              <p class="text-xs font-semibold text-slate-200 truncate">\${file.name}</p>
              <p class="text-[10px] font-mono text-slate-500 mt-0.5">\${formatSize(file.size)}</p>
            </div>
            <a href="\${API_BASE}/api/portal/download/\${file.id}" download="\${file.name}" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10">
              Download
            </a>
          \`;
          list.appendChild(item);
        });
      } catch (err) {
        console.error('Failed to load portal files:', err);
      }
    }

    function formatSize(bytes) {
      if (!bytes) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // Drop zone interactions
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-emerald-500/50', 'bg-emerald-500/5');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-emerald-500/50', 'bg-emerald-500/5');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-emerald-500/50', 'bg-emerald-500/5');
      if (e.dataTransfer.files.length > 0) {
        uploadFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        uploadFile(fileInput.files[0]);
      }
    });

    function uploadFile(file) {
      const progress = document.getElementById('upload-progress');
      const filenameLabel = document.getElementById('upload-filename');
      const percentLabel = document.getElementById('upload-percent');
      const progressBar = document.getElementById('upload-bar');

      progress.classList.remove('hidden');
      filenameLabel.textContent = file.name;
      percentLabel.textContent = '0%';
      progressBar.style.width = '0%';

      const xhr = new XMLHttpRequest();
      xhr.open('POST', \`\${API_BASE}/api/portal/upload?fileName=\${encodeURIComponent(file.name)}&size=\${file.size}\`, true);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          percentLabel.textContent = \`\${percent}%\`;
          progressBar.style.width = \`\${percent}%\`;
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          percentLabel.textContent = 'Done!';
          progressBar.style.width = '100%';
          setTimeout(() => {
            progress.classList.add('hidden');
          }, 3000);
        } else {
          percentLabel.textContent = 'Failed';
          progressBar.classList.replace('bg-gradient-to-r', 'bg-red-500');
        }
      };

      xhr.onerror = () => {
        percentLabel.textContent = 'Error';
        progressBar.classList.replace('bg-gradient-to-r', 'bg-red-500');
      };

      xhr.send(file);
    }

    loadPortal();
  </script>
</body>
</html>`;
      res.send(htmlPortal);
    });

    // 5. GET /api/portal/files
    this.app.get('/api/portal/files', (req, res) => {
      const settings = this.db.getSettings();
      const files = Array.from(this.portalSharedFiles.values()).map(f => ({
        id: f.id,
        name: f.name,
        size: f.size
      }));
      res.json({
        deviceName: settings.deviceName || 'LocalNetwork Node',
        files
      });
    });

    // 6. GET /api/portal/download/:fileId
    this.app.get('/api/portal/download/:fileId', (req, res) => {
      const { fileId } = req.params;
      if (!this.portalSharedFiles.has(fileId)) {
        return res.status(404).send('File not found or no longer shared.');
      }
      const fileInfo = this.portalSharedFiles.get(fileId);
      if (!fs.existsSync(fileInfo.path)) {
        return res.status(404).send('Physical file does not exist on host.');
      }
      
      const historyEntry = {
        fileName: fileInfo.name,
        size: fileInfo.size,
        senderDevice: 'Me',
        receiverDevice: 'Web Browser',
        status: 'Completed',
        filePath: fileInfo.path,
        direction: 'outgoing'
      };
      this.db.addHistoryEntry(historyEntry);

      this.notifyRenderer('transfer-complete', {
        transferId: 'portal_' + fileId,
        filePath: fileInfo.path,
        fileName: fileInfo.name,
        historyEntry
      });

      res.download(fileInfo.path, fileInfo.name);
    });

    // 7. POST /api/portal/upload
    const os = require('os');
    this.app.post('/api/portal/upload', (req, res) => {
      const fileName = req.query.fileName || 'uploaded_file';
      const size = parseInt(req.query.size || 0, 10);
      
      const settings = this.db.getSettings();
      let downloadDir = settings.saveFolder;
      if (!downloadDir) {
        downloadDir = path.join(os.homedir(), 'Downloads');
      }
      
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }
      
      let finalPath = path.join(downloadDir, fileName);
      const ext = path.extname(fileName);
      const base = path.basename(fileName, ext);
      let count = 1;
      while (fs.existsSync(finalPath)) {
        finalPath = path.join(downloadDir, `${base}_(${count})${ext}`);
        count++;
      }
      
      const finalFileName = path.basename(finalPath);
      const writeStream = fs.createWriteStream(finalPath);
      
      req.pipe(writeStream);
      
      writeStream.on('finish', () => {
        const historyEntry = {
          fileName: finalFileName,
          size: size,
          senderDevice: 'Web Browser',
          receiverDevice: 'Me',
          status: 'Completed',
          filePath: finalPath,
          direction: 'incoming'
        };
        this.db.addHistoryEntry(historyEntry);

        this.notifyRenderer('transfer-complete', {
          transferId: 'portal_upload_' + Math.random().toString(36).substr(2, 9),
          filePath: finalPath,
          fileName: finalFileName,
          historyEntry
        });

        res.json({ status: 'completed', fileName: finalFileName });
      });
      
      writeStream.on('error', (err) => {
        console.error('Portal upload error:', err);
        res.status(500).send(err.message);
      });
    });
  }

  respondToRequest(transferId, accepted, fileDetails, res) {
    if (accepted) {
      // Prepare destination folder
      const settings = this.db.getSettings();
      let downloadDir = settings.saveFolder;
      
      // Default fallback
      if (!downloadDir) {
        downloadDir = path.join(os.homedir(), 'Downloads');
      }

      // Check for Favorites toggle and route to a sub-folder if favorite
      if (settings.quickSaveFavorites && fileDetails.isFavorite) {
        downloadDir = path.join(downloadDir, 'AirSync_Favorites');
      }

      // Create directories if they don't exist
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }

      // Resolve file collision name
      let finalPath = path.join(downloadDir, fileDetails.fileName);
      const ext = path.extname(fileDetails.fileName);
      const base = path.basename(fileDetails.fileName, ext);
      let count = 1;
      while (fs.existsSync(finalPath)) {
        finalPath = path.join(downloadDir, `${base}_(${count})${ext}`);
        count++;
      }

      const finalFileName = path.basename(finalPath);

      // Register session
      this.activeUploads.set(transferId, {
        transferId,
        fileName: finalFileName,
        targetPath: finalPath,
        bytesReceived: 0,
        totalBytes: fileDetails.size,
        senderName: fileDetails.senderName,
        encrypted: fileDetails.encrypted,
        key: fileDetails.key,
        iv: fileDetails.iv
      });

      const host = fileDetails.host || `localhost:${this.port}`;
      res.json({
        status: 'accepted',
        transferId,
        fileName: finalFileName,
        uploadUrl: `http://${host}/api/transfer/upload?transferId=${transferId}`
      });
    } else {
      res.json({ status: 'rejected', reason: 'User declined the transfer' });
      
      // Add declined entry to history
      const historyEntry = {
        fileName: fileDetails.fileName,
        size: fileDetails.size,
        senderDevice: fileDetails.senderName,
        receiverDevice: 'Me',
        status: 'Declined',
        filePath: '',
        direction: 'incoming'
      };
      this.db.addHistoryEntry(historyEntry);
      
      this.notifyRenderer('transfer-declined', {
        transferId,
        historyEntry
      });
    }
  }

  initIPCHandlers() {
    // Listen for UI Accept/Decline action
    ipcMain.on('respond-transfer', (event, { transferId, accepted }) => {
      if (this.pendingTransfers.has(transferId)) {
        const { res, fileDetails, timeout } = this.pendingTransfers.get(transferId);
        clearTimeout(timeout);
        this.pendingTransfers.delete(transferId);

        this.respondToRequest(transferId, accepted, fileDetails, res);
      }
    });

    // Get list of portal files
    ipcMain.handle('portal-get-files', () => {
      return Array.from(this.portalSharedFiles.values());
    });

    // Add a file to portal sharing
    ipcMain.handle('portal-add-file', (event, { name, size, path: filePath }) => {
      const fileId = 'file_' + Math.random().toString(36).substr(2, 9);
      const fileInfo = { id: fileId, name, size, path: filePath };
      this.portalSharedFiles.set(fileId, fileInfo);
      
      // Also notify renderer that portal files changed
      this.notifyRenderer('portal-files-changed', Array.from(this.portalSharedFiles.values()));
      return fileInfo;
    });

    // Remove a file from portal sharing
    ipcMain.handle('portal-remove-file', (event, fileId) => {
      this.portalSharedFiles.delete(fileId);
      this.notifyRenderer('portal-files-changed', Array.from(this.portalSharedFiles.values()));
      return true;
    });

    // Get portal URL (using the first active IP of this node)
    ipcMain.handle('portal-get-url', () => {
      const { networkInterfaces } = require('os');
      const nets = networkInterfaces();
      let ip = '127.0.0.1';
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === 'IPv4' && !net.internal) {
            ip = net.address;
            break;
          }
        }
        if (ip !== '127.0.0.1') break;
      }
      return `http://${ip}:${this.port}/portal`;
    });
  }

  notifyRenderer(channel, data) {
    if (this.onMessageCallback) {
      this.onMessageCallback(channel, data);
    }
  }

  registerMessageCallback(cb) {
    this.onMessageCallback = cb;
  }

  start() {
    return new Promise((resolve, reject) => {
      const server = this.app.listen(this.port, () => {
        this.serverInstance = server;
        resolve(this.port);
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${this.port} in use, trying next port...`);
          this.port++;
          server.close();
          this.start().then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });
    });
  }

  stop() {
    if (this.serverInstance) {
      this.serverInstance.close();
    }
  }
}

module.exports = ExpressServer;
