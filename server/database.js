const fs = require('fs');
const path = require('path');

class LocalDatabase {
  constructor(userDataPath) {
    this.dbPath = path.join(userDataPath, 'app_data.json');
    this.data = {
      settings: {
        theme: 'system',
        accentColor: 'cyberpunk', // 'cyberpunk' (purple), 'emerald' (green), 'electric' (blue)
        language: 'en',
        saveWindowStatus: true,
        closeToTray: true,
        autoStart: false,
        enableAnimations: true,
        quickSave: false,
        quickSaveFavorites: false,
        requirePin: false,
        pinCode: '1234',
        saveFolder: '', // Defaults to Downloads folder
        autoFinish: true,
        saveToHistory: true,
        windowBounds: { width: 940, height: 680, x: undefined, y: undefined },
        activeTab: 'discovery',
        favorites: [], // Array of device IDs
        shareViaLinkAutoAccept: false,
        deviceModel: '',
        port: 53343,
        discoveryTimeout: 500,
        encryptionEnabled: false,
        multicastAddress: '224.0.0.167'
      },
      history: []
    };
    
    this.init();
  }

  init() {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.dbPath)) {
        const fileContent = fs.readFileSync(this.dbPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        this.data = {
          settings: { ...this.data.settings, ...parsed.settings },
          history: Array.isArray(parsed.history) ? parsed.history : []
        };
      } else {
        this.save();
      }
    } catch (error) {
      console.error('Failed to initialize local database:', error);
    }
  }

  save() {
    try {
      // Write atomically to avoid file corruption
      const tempPath = this.dbPath + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tempPath, this.dbPath);
    } catch (error) {
      console.error('Failed to save data to local database:', error);
    }
  }

  getSettings() {
    return this.data.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
    return this.data.settings;
  }

  getHistory() {
    return this.data.history;
  }

  addHistoryEntry(entry) {
    if (!this.data.settings.saveToHistory) return;
    
    const newEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      fileName: entry.fileName || 'unknown',
      size: entry.size || 0,
      senderDevice: entry.senderDevice || 'unknown',
      receiverDevice: entry.receiverDevice || 'unknown',
      status: entry.status || 'Completed', // 'Completed', 'Failed', 'Declined'
      filePath: entry.filePath || '',
      direction: entry.direction || 'incoming' // 'incoming' or 'outgoing'
    };

    this.data.history.unshift(newEntry); // Latest transfers first
    this.save();
    return newEntry;
  }

  clearHistory() {
    this.data.history = [];
    this.save();
  }
}

module.exports = LocalDatabase;
