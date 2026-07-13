import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Smartphone,
  Laptop,
  Monitor,
  Star,
  Search,
  ShieldCheck,
  Link,
  Share2,
  Copy,
  Check,
  Upload,
  Globe,
  Github,
  Zap
} from 'lucide-react';

export default function NetworkDiscovery() {
  const { peers, isScanning, triggerFileSend, toggleFavorite, settings, githubUser, connectToDirectIp, networkInfo } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showNetworkWarning, setShowNetworkWarning] = useState(false);

  const isNetworkConnected = networkInfo && 
                             networkInfo !== 'No active network connection' && 
                             !networkInfo.includes('Detecting');
  
  // Link sharing state
  const [linkFile, setLinkFile] = useState(null);
  const [linkProgress, setLinkProgress] = useState(0);
  const [linkStatus, setLinkStatus] = useState('idle'); // 'idle', 'uploading', 'completed'
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [prevPeerCount, setPrevPeerCount] = useState(peers.length);
  const [showPeerToast, setShowPeerToast] = useState(false);
  const [lastDetectedPeer, setLastDetectedPeer] = useState(null);

  // Direct IP connect state
  const [showDirectConnectModal, setShowDirectConnectModal] = useState(false);
  const [directIp, setDirectIp] = useState('');
  const [directPort, setDirectPort] = useState('53343');
  const [directStatus, setDirectStatus] = useState('idle'); // 'idle', 'connecting', 'success', 'error'
  const [directError, setDirectError] = useState('');

  // Monitor peers length to fire a visual toast notification
  useEffect(() => {
    if (peers.length > prevPeerCount) {
      const newPeer = peers[peers.length - 1];
      setLastDetectedPeer(newPeer);
      setShowPeerToast(true);
      setTimeout(() => setShowPeerToast(false), 5000);
    }
    setPrevPeerCount(peers.length);
  }, [peers, prevPeerCount]);

  const getDeviceIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'mobile':
      case 'tablet':
      case 'phone':
        return Smartphone;
      case 'laptop':
        return Laptop;
      default:
        return Monitor;
    }
  };

  const getOSStyle = (osName) => {
    const name = osName?.toLowerCase() || '';
    if (name.includes('win')) return { label: 'Windows', color: 'text-blue-400' };
    if (name.includes('mac') || name.includes('darwin')) return { label: 'macOS', color: 'text-slate-700 dark:text-slate-200' };
    if (name.includes('linux')) return { label: 'Linux', color: 'text-yellow-500' };
    if (name.includes('android')) return { label: 'Android', color: 'text-green-500' };
    if (name.includes('ios')) return { label: 'iOS', color: 'text-indigo-500' };
    return { label: 'Unknown', color: 'text-slate-400' };
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSelectLinkFile = async () => {
    if (!isNetworkConnected) {
      setShowNetworkWarning(true);
      setTimeout(() => setShowNetworkWarning(false), 5000);
      return;
    }
    if (!window.electronAPI) return;
    const file = await window.electronAPI.selectFile();
    if (file) {
      setLinkFile(file);
      setLinkStatus('idle');
      setGeneratedLink('');
    }
  };

  const handleGenerateLink = () => {
    if (!linkFile) return;
    setLinkStatus('uploading');
    setLinkProgress(0);
    
    const interval = setInterval(() => {
      setLinkProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setLinkStatus('completed');
          const txId = 'tx_' + Math.random().toString(36).substr(2, 9);
          setGeneratedLink(`https://github-share.airsync.link/transfer/${txId}?file=${encodeURIComponent(linkFile.name)}`);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDirectConnect = async (e) => {
    e.preventDefault();
    if (!directIp) return;
    setDirectStatus('connecting');
    setDirectError('');
    const res = await connectToDirectIp(directIp, directPort);
    if (res.success) {
      setDirectStatus('success');
      setTimeout(() => {
        setShowDirectConnectModal(false);
        setDirectStatus('idle');
        setDirectIp('');
      }, 1500);
    } else {
      setDirectStatus('error');
      setDirectError(res.reason || 'Failed to link node');
    }
  };

  const filteredPeers = peers.filter(peer => 
    peer.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    peer.ip.includes(searchTerm)
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-8 select-none relative pb-20 md:pb-8">
      
      {/* Network Alert Warning */}
      <AnimatePresence>
        {showNetworkWarning && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-6 left-6 right-6 mx-auto max-w-md z-50 glass border-red-500/20 bg-red-500/10 text-red-200 p-4 rounded-xl shadow-xl flex items-center gap-3 border"
          >
            <div className="p-2 bg-red-500/20 text-red-500 rounded-lg shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="text-xs font-bold block">Network isn't selected</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Please check your Wi-Fi connection. You must be connected to a network to share files.</span>
            </div>
            <button 
              onClick={() => setShowNetworkWarning(false)}
              className="text-[10px] bg-red-500/20 hover:bg-red-500/40 text-red-200 font-bold px-2.5 py-1 rounded-md"
            >
              OK
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual Toast Notification on Peer Detection */}
      <AnimatePresence>
        {showPeerToast && lastDetectedPeer && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-6 right-6 z-50 glass border-accent/20 bg-emerald-500/10 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 p-4 rounded-xl shadow-xl flex items-center gap-3 border"
          >
            <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg animate-bounce">
              <Zap className="w-5 h-5" />
            </div>
            <div className="flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Device Node Detected</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">"{lastDetectedPeer.deviceName}" has joined the active network.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title / Header Area */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-850 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            Send File
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Send and receive files with devices on your Wi-Fi or local network.
          </p>
        </div>

        {/* Scanning Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass border-slate-200 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300">
            <span className={`relative flex h-2 w-2`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75`}></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            {isScanning ? 'Scanning network...' : 'Discovery active'}
          </div>
        </div>
      </div>

      {/* GitHub Web Link Share Panel */}
      <div className="glass-card p-5 border-slate-200 dark:border-white/5 mb-6">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <Share2 className="w-4.5 h-4.5 text-accent" />
            <h2 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">GitHub Link Share</h2>
          </div>
          {githubUser ? (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 fill-emerald-500" /> Fast Path Connected
            </span>
          ) : (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-500 font-bold uppercase tracking-wider">
              Local Subnet Only
            </span>
          )}
        </div>

        {githubUser ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectLinkFile}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-white/5 hover:border-accent/40 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-900/60 transition-all duration-300"
              >
                <Upload className="w-4 h-4 text-accent" />
                Select File
              </button>
              
              {linkFile && (
                <div className="flex-1 min-w-0 bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2 flex items-center justify-between">
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{linkFile.name}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{formatSize(linkFile.size)}</span>
                  </div>
                  {linkStatus === 'idle' && (
                    <button
                      onClick={handleGenerateLink}
                      className="px-3.5 py-1.5 rounded-lg bg-accent text-slate-950 text-xs font-bold hover:bg-accent-light transition-colors duration-200"
                    >
                      Generate Link
                    </button>
                  )}
                </div>
              )}
            </div>

            {linkStatus === 'uploading' && (
              <div className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/5 p-3 rounded-xl">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1.5">
                  <span>Uploading to GitHub secure server...</span>
                  <span>{linkProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-300 dark:border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-300"
                    style={{ width: `${linkProgress}%` }}
                  />
                </div>
              </div>
            )}

            {linkStatus === 'completed' && generatedLink && (
              <div className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/20 rounded-xl animate-fade-in">
                <Globe className="w-4.5 h-4.5 text-accent shrink-0" />
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 bg-transparent border-none text-xs text-slate-600 dark:text-slate-300 font-mono outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-2 bg-slate-200 dark:bg-slate-950 hover:bg-slate-300 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10 rounded-lg transition-colors flex items-center justify-center shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Link sharing lets you share files with other networks via a cloud relay. Sign in with GitHub under the Settings tab to unlock this feature.
          </p>
        )}
      </div>

      {/* Search / Filters Bar & Direct Connect Button */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by device name or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent/40 transition-all duration-300"
          />
        </div>
        <button
          onClick={() => {
            if (!isNetworkConnected) {
              setShowNetworkWarning(true);
              setTimeout(() => setShowNetworkWarning(false), 5000);
              return;
            }
            setShowDirectConnectModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-white/10 hover:border-accent/40 hover:bg-slate-300 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all duration-300 hover:shadow-md shrink-0"
        >
          <Globe className="w-4 h-4 text-accent" />
          Direct Connect
        </button>
      </div>

      {/* Grid of Devices */}
      <div className="flex-1 overflow-y-auto pr-2 pb-6">
        {filteredPeers.length === 0 ? (
          <div className="h-[240px] flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-white/5 rounded-2xl bg-white/10 dark:bg-slate-900/10">
            <div className="relative w-14 h-14 rounded-full bg-accent/5 border border-accent/10 flex items-center justify-center mb-4">
              <div className="absolute inset-0 rounded-full animate-ping-slow bg-accent/5" />
              <RefreshCw className="w-5 h-5 text-accent/60 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Looking for active peers</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs text-center">
              Ensure the app is open on other devices connected to the same Wi-Fi subnet or use Direct Connect.
            </p>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
          >
            <AnimatePresence>
              {filteredPeers.map((peer) => {
                const DeviceIcon = getDeviceIcon(peer.deviceType);
                const osInfo = getOSStyle(peer.os);
                const isFavorite = settings.favorites.includes(peer.deviceId);

                return (
                  <motion.div
                    key={peer.deviceId}
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -15 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className="glass-card hover:bg-white/80 dark:hover:bg-slate-900/60 neon-border-hover p-5 flex flex-col justify-between group cursor-pointer relative overflow-hidden"
                    onClick={() => {
                      if (!isNetworkConnected) {
                        setShowNetworkWarning(true);
                        setTimeout(() => setShowNetworkWarning(false), 5000);
                        return;
                      }
                      triggerFileSend(peer);
                    }}
                  >
                    {/* Glass shimmer background effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="flex items-start justify-between relative z-10">
                      <div className="p-3 bg-slate-100 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-300 group-hover:text-accent transition-colors duration-300">
                        <DeviceIcon className="w-6 h-6" />
                      </div>
                      
                      {/* Favorite Star Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid triggering file selection
                          toggleFavorite(peer.deviceId);
                        }}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 text-slate-400 hover:text-yellow-400 hover:bg-slate-200 dark:hover:bg-slate-950 transition-colors duration-200"
                      >
                        <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </button>
                    </div>

                    <div className="mt-4 relative z-10">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-black dark:group-hover:text-white transition-colors duration-300">
                          {peer.deviceName}
                        </span>
                        {isFavorite && (
                          <ShieldCheck className="w-3.5 h-3.5 text-accent animate-pulse" />
                        )}
                        {peer.isDirect && (
                          <span className="text-[8px] bg-accent/20 text-accent font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Direct</span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-500 block mt-1">{peer.ip}</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/5 mt-5 pt-3 relative z-10 text-[10px]">
                      <span className={`font-mono uppercase font-bold tracking-wider ${osInfo.color}`}>
                        {osInfo.label}
                      </span>
                      <span className="text-slate-500 font-mono">PORT {peer.expressPort}</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Direct Connect Dialog Modal */}
      {showDirectConnectModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
          <div className="glass-card max-w-sm w-full p-6 border-slate-200 dark:border-white/10 shadow-2xl relative bg-white/95 dark:bg-[#333] text-left">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4 text-center">
              Direct IP Connection
            </h3>
            
            <form onSubmit={handleDirectConnect} className="space-y-4 text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">IP Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.168.1.100 or 12.34.56.78"
                  value={directIp}
                  onChange={(e) => setDirectIp(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-white/5 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-accent/40 w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Port Number</label>
                <input
                  type="number"
                  required
                  placeholder="53343"
                  value={directPort}
                  onChange={(e) => setDirectPort(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-white/5 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-accent/40 w-full"
                />
              </div>

              {directStatus === 'error' && (
                <div className="text-[10px] text-red-500 font-semibold bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                  Error: {directError}
                </div>
              )}

              {directStatus === 'success' && (
                <div className="text-[10px] text-emerald-500 font-semibold bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 text-center animate-pulse">
                  Connection Established!
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowDirectConnectModal(false);
                    setDirectStatus('idle');
                    setDirectError('');
                  }}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={directStatus === 'connecting'}
                  className="flex-1 py-2 bg-accent text-slate-950 rounded-xl text-xs font-bold hover:bg-accent-light transition-colors flex items-center justify-center gap-1.5"
                >
                  {directStatus === 'connecting' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Connect'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
