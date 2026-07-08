import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

const ACCENT_COLORS = {
  cyberpunk: {
    primary: '139, 92, 246', // Purple
    light: '167, 139, 250',
    dark: '124, 58, 237'
  },
  emerald: {
    primary: '16, 185, 129', // Green
    light: '52, 211, 153',
    dark: '5, 150, 105'
  },
  electric: {
    primary: '59, 130, 246', // Blue
    light: '96, 165, 250',
    dark: '37, 99, 235'
  }
};

export const AppProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    theme: 'dark',
    accentColor: 'cyberpunk',
    language: 'en',
    saveWindowStatus: true,
    closeToTray: true,
    autoStart: false,
    enableAnimations: true,
    quickSave: false,
    quickSaveFavorites: false,
    requirePin: false,
    pinCode: '1234',
    saveFolder: '',
    autoFinish: true,
    saveToHistory: true,
    favorites: []
  });

  const [activeTab, setActiveTab] = useState('discovery');
  const [peers, setPeers] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState([]);
  
  // Transfers state
  const [incomingTransfer, setIncomingTransfer] = useState(null);
  const [outgoingTransfer, setOutgoingTransfer] = useState(null);
  const [transferProgress, setTransferProgress] = useState(null);
  const [transferStatus, setTransferStatus] = useState(null); // 'idle', 'requesting', 'transferring', 'completed', 'error'
  const [transferError, setTransferError] = useState(null);

  // Bluetooth state
  const [bluetoothDevices, setBluetoothDevices] = useState([]);
  const [isBluetoothScanning, setIsBluetoothScanning] = useState(false);
  const [pairedBluetoothDevices, setPairedBluetoothDevices] = useState([]);
  const [bluetoothHandshakeState, setBluetoothHandshakeState] = useState('idle'); // 'idle', 'pairing', 'success', 'failed'
  const [bluetoothPairingDevice, setBluetoothPairingDevice] = useState(null);

  // 1. Initial configuration load
  useEffect(() => {
    async function loadConfig() {
      if (window.electronAPI) {
        const initSettings = await window.electronAPI.getSettings();
        setSettings(initSettings);
        if (initSettings.activeTab) {
          setActiveTab(initSettings.activeTab);
        }
        
        const initHistory = await window.electronAPI.getHistory();
        setHistory(initHistory);
      }
    }
    loadConfig();
  }, []);

  // 2. React to theme & accent changes dynamically
  useEffect(() => {
    // Dynamic Accent Colors updates
    const colors = ACCENT_COLORS[settings.accentColor] || ACCENT_COLORS.cyberpunk;
    const root = document.documentElement;
    root.style.setProperty('--color-accent', colors.primary);
    root.style.setProperty('--color-accent-light', colors.light);
    root.style.setProperty('--color-accent-dark', colors.dark);
    root.style.setProperty('--color-accent-glow', `rgba(${colors.primary}, 0.15)`);

    // Dynamic Light / Dark mode
    const systemThemeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (settings.theme === 'dark' || (settings.theme === 'system' && systemThemeDark)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme, settings.accentColor]);

  // 3. IPC event subscribers
  useEffect(() => {
    if (!window.electronAPI) return;

    // UDP Discoveries
    const unsubPeers = window.electronAPI.onPeersUpdated((updatedPeers) => {
      setPeers(updatedPeers);
    });

    const unsubScanning = window.electronAPI.onScanningState((scanning) => {
      setIsScanning(scanning);
    });

    // Inbound transfer pipeline
    const unsubIncomingRequest = window.electronAPI.onIncomingTransfer((details) => {
      setIncomingTransfer(details);
      setTransferStatus('requesting');
      setTransferProgress(null);
      setTransferError(null);
    });

    const unsubProgress = window.electronAPI.onTransferProgress((progress) => {
      setTransferProgress(progress);
      setTransferStatus('transferring');
    });

    const unsubComplete = window.electronAPI.onTransferComplete(async (result) => {
      setTransferStatus('completed');
      setTransferProgress({ percent: 100 });
      
      // Auto-trigger native notification & close if requested
      if (settings.autoFinish) {
        new Notification('Transfer Complete', {
          body: `Successfully received ${result.fileName}`
        });
        setTimeout(() => {
          setIncomingTransfer(null);
          setTransferProgress(null);
          setTransferStatus(null);
        }, 2000);
      }

      // Reload database history
      const updatedHistory = await window.electronAPI.getHistory();
      setHistory(updatedHistory);
    });

    const unsubError = window.electronAPI.onTransferError((err) => {
      setTransferStatus('error');
      setTransferError(err.reason);
    });

    const unsubDeclined = window.electronAPI.onTransferDeclined(async () => {
      setIncomingTransfer(null);
      setTransferStatus(null);
      const updatedHistory = await window.electronAPI.getHistory();
      setHistory(updatedHistory);
    });

    // Outbound transfer pipeline
    const unsubOutgoingStart = window.electronAPI.onOutgoingTransferStart((details) => {
      setOutgoingTransfer(details);
      setTransferStatus(details.status === 'requesting' ? 'requesting' : 'transferring');
      setTransferProgress(null);
      setTransferError(null);
    });

    const unsubOutgoingProgress = window.electronAPI.onOutgoingTransferProgress((progress) => {
      setTransferProgress(progress);
      setTransferStatus('transferring');
    });

    const unsubOutgoingComplete = window.electronAPI.onOutgoingTransferComplete(async () => {
      setTransferStatus('completed');
      setTransferProgress({ percent: 100 });
      
      if (settings.autoFinish) {
        new Notification('Transfer Complete', {
          body: `File successfully sent to ${outgoingTransfer?.peer?.deviceName}`
        });
        setTimeout(() => {
          setOutgoingTransfer(null);
          setTransferProgress(null);
          setTransferStatus(null);
        }, 2000);
      }

      const updatedHistory = await window.electronAPI.getHistory();
      setHistory(updatedHistory);
    });

    const unsubOutgoingError = window.electronAPI.onOutgoingTransferError((err) => {
      setTransferStatus('error');
      setTransferError(err.reason || 'File transfer failed or was cancelled');
    });

    // Bluetooth callbacks
    const unsubBtDevice = window.electronAPI.onBluetoothDeviceFound((device) => {
      setBluetoothDevices((prev) => {
        if (prev.find((d) => d.id === device.id)) return prev;
        return [...prev, device];
      });
    });

    const unsubBtPairSuccess = window.electronAPI.onBluetoothPairingSuccess((deviceId) => {
      setBluetoothHandshakeState('success');
      setPairedBluetoothDevices((prev) => [...prev, deviceId]);
      
      // Update favorites in settings or mock it
      setTimeout(() => {
        setBluetoothHandshakeState('idle');
        setBluetoothPairingDevice(null);
      }, 2000);
    });

    return () => {
      unsubPeers();
      unsubScanning();
      unsubIncomingRequest();
      unsubProgress();
      unsubComplete();
      unsubError();
      unsubDeclined();
      unsubOutgoingStart();
      unsubOutgoingProgress();
      unsubOutgoingComplete();
      unsubOutgoingError();
      unsubBtDevice();
      unsubBtPairSuccess();
    };
  }, [settings.autoFinish, outgoingTransfer]);

  // Settings updating abstraction
  const updateSettings = (newSettings) => {
    setSettings((prev) => {
      const next = { ...prev, ...newSettings };
      
      // Save to disk in the background
      if (window.electronAPI) {
        window.electronAPI.updateSettings(newSettings).then((latest) => {
          setSettings(latest);
        });
      }
      return next;
    });
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
    updateSettings({ activeTab: tab });
  };

  // Actions trigger wrapping
  const selectDownloadsFolder = async () => {
    if (window.electronAPI) {
      const folder = await window.electronAPI.selectDirectory();
      if (folder) {
        updateSettings({ saveFolder: folder });
      }
    }
  };

  const clearHistory = async () => {
    if (window.electronAPI) {
      await window.electronAPI.clearHistory();
      setHistory([]);
    }
  };

  const startBluetoothScan = () => {
    setBluetoothDevices([]);
    setIsBluetoothScanning(true);
    if (window.electronAPI) {
      window.electronAPI.startBluetoothScan();
    }
  };

  const stopBluetoothScan = () => {
    setIsBluetoothScanning(false);
    if (window.electronAPI) {
      window.electronAPI.stopBluetoothScan();
    }
  };

  const pairBluetoothDevice = (device) => {
    setBluetoothPairingDevice(device);
    setBluetoothHandshakeState('pairing');
    if (window.electronAPI) {
      window.electronAPI.pairBluetoothDevice(device.id);
    }
  };

  const triggerFileSend = (peer) => {
    if (window.electronAPI) {
      window.electronAPI.selectAndSendFile(peer);
    }
  };

  const respondToTransfer = (transferId, accepted) => {
    if (window.electronAPI) {
      window.electronAPI.respondToTransfer(transferId, accepted);
    }
    if (!accepted) {
      setIncomingTransfer(null);
      setTransferStatus(null);
    }
  };

  const closeTransferModal = () => {
    setIncomingTransfer(null);
    setOutgoingTransfer(null);
    setTransferProgress(null);
    setTransferStatus(null);
    setTransferError(null);
  };

  // Toggle favorite device ID
  const toggleFavorite = (deviceId) => {
    const list = [...settings.favorites];
    const index = list.indexOf(deviceId);
    if (index >= 0) {
      list.splice(index, 1);
    } else {
      list.push(deviceId);
    }
    updateSettings({ favorites: list });
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        activeTab,
        setActiveTab: changeTab,
        peers,
        isScanning,
        history,
        clearHistory,
        selectDownloadsFolder,
        
        // Transfer triggers
        incomingTransfer,
        outgoingTransfer,
        transferProgress,
        transferStatus,
        transferError,
        respondToTransfer,
        closeTransferModal,
        triggerFileSend,
        toggleFavorite,
        
        // Bluetooth operations
        bluetoothDevices,
        isBluetoothScanning,
        pairedBluetoothDevices,
        bluetoothHandshakeState,
        bluetoothPairingDevice,
        startBluetoothScan,
        stopBluetoothScan,
        pairBluetoothDevice,
        setBluetoothHandshakeState
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
