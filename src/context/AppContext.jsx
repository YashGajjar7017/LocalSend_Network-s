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
    encryptionEnabled: false,
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

  // New additions
  const [githubUser, setGithubUser] = useState(null);
  const [googleUser, setGoogleUser] = useState(null);
  const [serverState, setServerState] = useState('running');
  const [networkInfo, setNetworkInfo] = useState('Detecting network status...');

  // 1. Initial configuration load
  useEffect(() => {
    async function loadConfig() {
      if (window.electronAPI) {
        const initSettings = await window.electronAPI.getSettings();
        setSettings(initSettings);
        if (initSettings.activeTab) {
          setActiveTab(initSettings.activeTab);
        }
        if (initSettings.githubUser) {
          setGithubUser(initSettings.githubUser);
        }
        if (initSettings.googleUser) {
          setGoogleUser(initSettings.googleUser);
        }
        
        const initHistory = await window.electronAPI.getHistory();
        setHistory(initHistory);
      }
    }
    loadConfig();
  }, []);

  // Fetch local network IP and interface info
  useEffect(() => {
    async function fetchNetwork() {
      if (window.electronAPI) {
        const info = await window.electronAPI.getNetworkInfo();
        setNetworkInfo(info);
      }
    }
    fetchNetwork();
  }, [serverState]);

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
    root.classList.remove('theme-system', 'theme-localsend', 'theme-oled', 'theme-yaru');
    const isCustomDarkTheme = ['localsend', 'oled', 'yaru'].includes(settings.theme);
    const systemThemeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const shouldBeDark = isCustomDarkTheme || settings.theme === 'dark' || (settings.theme === 'system' && systemThemeDark);
    
    if (shouldBeDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (isCustomDarkTheme) {
      root.classList.add(`theme-${settings.theme}`);
      
      // Override accent colors for themes that bundle their own accent color
      if (settings.theme === 'localsend') {
        root.style.setProperty('--color-accent', '20, 184, 166'); // Teal
        root.style.setProperty('--color-accent-light', '45, 212, 191');
        root.style.setProperty('--color-accent-dark', '13, 148, 136');
        root.style.setProperty('--color-accent-glow', 'rgba(20, 184, 166, 0.15)');
      } else if (settings.theme === 'yaru') {
        root.style.setProperty('--color-accent', '233, 84, 32'); // Orange
        root.style.setProperty('--color-accent-light', '242, 122, 87');
        root.style.setProperty('--color-accent-dark', '191, 55, 10');
        root.style.setProperty('--color-accent-glow', 'rgba(233, 84, 32, 0.15)');
      }
    } else {
      root.classList.add('theme-system');
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
    if (accepted) {
      setTransferStatus('transferring');
    } else {
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
  const [directPeers, setDirectPeers] = useState([]);

  const connectToDirectIp = async (ip, port) => {
    try {
      const response = await fetch(`http://${ip}:${port}/api/device-info`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        const data = await response.json();
        const directPeer = {
          deviceId: data.deviceId,
          deviceName: data.deviceName,
          deviceType: data.deviceType,
          os: data.os || 'Unknown',
          expressPort: parseInt(port),
          ip: ip,
          lastSeen: Date.now(),
          isDirect: true
        };
        setDirectPeers(prev => {
          const list = prev.filter(p => p.deviceId !== directPeer.deviceId);
          return [...list, directPeer];
        });
        return { success: true, device: directPeer };
      }
      return { success: false, reason: `Device returned code: ${response.status}` };
    } catch (e) {
      return { success: false, reason: 'Device did not respond or network unreachable' };
    }
  };

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

  const loginGitHub = async () => {
    if (window.electronAPI) {
      const user = await window.electronAPI.githubSignin();
      if (user) {
        setGithubUser(user);
        updateSettings({ githubUser: user });
      }
    }
  };

  const logoutGitHub = () => {
    setGithubUser(null);
    updateSettings({ githubUser: null });
  };

  const loginGoogle = async () => {
    if (window.electronAPI) {
      const user = await window.electronAPI.googleSignin();
      if (user) {
        setGoogleUser(user);
        updateSettings({ googleUser: user });
      }
    }
  };

  const logoutGoogle = () => {
    setGoogleUser(null);
    updateSettings({ googleUser: null });
  };

  const stopServer = async () => {
    setServerState('stopping');
    if (window.electronAPI) {
      const res = await window.electronAPI.stopServer();
      if (res.status === 'stopped') {
        setServerState('stopped');
      } else {
        setServerState('error');
      }
    }
  };

  const startServer = async () => {
    setServerState('starting');
    if (window.electronAPI) {
      const res = await window.electronAPI.startServer();
      if (res.status === 'running') {
        setServerState('running');
      } else {
        setServerState('error');
      }
    }
  };

  const [portalFiles, setPortalFiles] = useState([]);
  const [portalUrl, setPortalUrl] = useState('');

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.portalGetFiles().then(setPortalFiles);
      window.electronAPI.portalGetUrl().then(setPortalUrl);

      const unsubPortalFiles = window.electronAPI.onPortalFilesChanged((files) => {
        setPortalFiles(files);
      });
      return () => {
        unsubPortalFiles();
      };
    }
  }, []);

  const addFileToPortal = async (fileInfo) => {
    if (window.electronAPI) {
      await window.electronAPI.portalAddFile(fileInfo);
    }
  };

  const removeFileFromPortal = async (fileId) => {
    if (window.electronAPI) {
      await window.electronAPI.portalRemoveFile(fileId);
    }
  };

  const restartServer = async () => {
    setServerState('restarting');
    if (window.electronAPI) {
      const res = await window.electronAPI.restartServer();
      if (res.status === 'running') {
        setServerState('running');
      } else {
        setServerState('error');
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        activeTab,
        setActiveTab: changeTab,
        peers: [...peers, ...directPeers.filter(dp => !peers.some(p => p.deviceId === dp.deviceId))],
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
        setBluetoothHandshakeState,
        // Web Share Portal
        portalFiles,
        portalUrl,
        addFileToPortal,
        removeFileFromPortal,

        // GitHub and Server controls
        githubUser,
        googleUser,
        serverState,
        networkInfo,
        loginGitHub,
        logoutGitHub,
        loginGoogle,
        logoutGoogle,
        stopServer,
        startServer,
        restartServer,
        connectToDirectIp
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
