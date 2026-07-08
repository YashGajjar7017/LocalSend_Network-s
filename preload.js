const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Database / Settings
  getSettings: () => ipcRenderer.invoke('db-get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('db-update-settings', settings),
  getHistory: () => ipcRenderer.invoke('db-get-history'),
  clearHistory: () => ipcRenderer.invoke('db-clear-history'),
  
  // App Operations
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  openFolder: (filePath) => ipcRenderer.send('open-folder', filePath),
  
  // File Transfer Control
  selectAndSendFile: (peer) => ipcRenderer.send('select-and-send-file', peer),
  respondToTransfer: (transferId, accepted) => ipcRenderer.send('respond-transfer', { transferId, accepted }),
  
  // Bluetooth control
  startBluetoothScan: () => ipcRenderer.send('bluetooth-start-scan'),
  stopBluetoothScan: () => ipcRenderer.send('bluetooth-stop-scan'),
  pairBluetoothDevice: (deviceId) => ipcRenderer.send('bluetooth-pair', deviceId),
  
  // Event Receivers
  onPeersUpdated: (callback) => {
    const subscription = (event, peers) => callback(peers);
    ipcRenderer.on('peers-updated', subscription);
    return () => ipcRenderer.removeListener('peers-updated', subscription);
  },
  
  onScanningState: (callback) => {
    const subscription = (event, isScanning) => callback(isScanning);
    ipcRenderer.on('scanning-state', subscription);
    return () => ipcRenderer.removeListener('scanning-state', subscription);
  },

  onIncomingTransfer: (callback) => {
    const subscription = (event, details) => callback(details);
    ipcRenderer.on('incoming-transfer-request', subscription);
    return () => ipcRenderer.removeListener('incoming-transfer-request', subscription);
  },

  onTransferProgress: (callback) => {
    const subscription = (event, progress) => callback(progress);
    ipcRenderer.on('transfer-progress', subscription);
    return () => ipcRenderer.removeListener('transfer-progress', subscription);
  },

  onTransferComplete: (callback) => {
    const subscription = (event, result) => callback(result);
    ipcRenderer.on('transfer-complete', subscription);
    return () => ipcRenderer.removeListener('transfer-complete', subscription);
  },

  onTransferError: (callback) => {
    const subscription = (event, result) => callback(result);
    ipcRenderer.on('transfer-error', subscription);
    return () => ipcRenderer.removeListener('transfer-error', subscription);
  },

  onTransferDeclined: (callback) => {
    const subscription = (event, result) => callback(result);
    ipcRenderer.on('transfer-declined', subscription);
    return () => ipcRenderer.removeListener('transfer-declined', subscription);
  },

  onOutgoingTransferStart: (callback) => {
    const subscription = (event, details) => callback(details);
    ipcRenderer.on('outgoing-transfer-start', subscription);
    return () => ipcRenderer.removeListener('outgoing-transfer-start', subscription);
  },

  onOutgoingTransferProgress: (callback) => {
    const subscription = (event, progress) => callback(progress);
    ipcRenderer.on('outgoing-transfer-progress', subscription);
    return () => ipcRenderer.removeListener('outgoing-transfer-progress', subscription);
  },

  onOutgoingTransferComplete: (callback) => {
    const subscription = (event, result) => callback(result);
    ipcRenderer.on('outgoing-transfer-complete', subscription);
    return () => ipcRenderer.removeListener('outgoing-transfer-complete', subscription);
  },

  onOutgoingTransferError: (callback) => {
    const subscription = (event, result) => callback(result);
    ipcRenderer.on('outgoing-transfer-error', subscription);
    return () => ipcRenderer.removeListener('outgoing-transfer-error', subscription);
  },

  onBluetoothDeviceFound: (callback) => {
    const subscription = (event, device) => callback(device);
    ipcRenderer.on('bluetooth-device-found', subscription);
    return () => ipcRenderer.removeListener('bluetooth-device-found', subscription);
  },

  onBluetoothPairingSuccess: (callback) => {
    const subscription = (event, deviceId) => callback(deviceId);
    ipcRenderer.on('bluetooth-pairing-success', subscription);
    return () => ipcRenderer.removeListener('bluetooth-pairing-success', subscription);
  }
});
