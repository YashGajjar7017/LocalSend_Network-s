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
      const { senderId, senderName, deviceType, fileName, size, pin, isLinkShare } = req.body;
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
        timestamp: Date.now()
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
      const { targetPath, totalBytes } = session;
      
      const writeStream = fs.createWriteStream(targetPath);
      session.writeStream = writeStream;
      session.startTime = Date.now();

      req.pipe(writeStream);

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
        senderName: fileDetails.senderName
      });

      res.json({
        status: 'accepted',
        transferId,
        fileName: finalFileName,
        uploadUrl: `http://localhost:${this.port}/api/transfer/upload?transferId=${transferId}`
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
      this.serverInstance = this.app.listen(this.port, () => {
        resolve(this.port);
      }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          // If port is in use, try next ports dynamically
          this.port++;
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
