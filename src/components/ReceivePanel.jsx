import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { History, Info, Wifi, Star, CheckCircle, ShieldCheck } from 'lucide-react';

export default function ReceivePanel() {
  const { settings, updateSettings, networkInfo, setActiveTab } = useApp();
  const [showInfo, setShowInfo] = useState(false);

  // Parse IP addresses from networkInfo adaptor details string
  const getIpsList = () => {
    if (!networkInfo || networkInfo.includes('Detecting')) return ['#LocalNode'];
    const matches = networkInfo.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g);
    if (matches && matches.length > 0) {
      return matches.map(ip => `#${ip}`);
    }
    return ['#DetectingIP...'];
  };

  const ips = getIpsList();

  const handleQuickSaveChange = (mode) => {
    if (mode === 'off') {
      updateSettings({ quickSave: false, quickSaveFavorites: false });
    } else if (mode === 'favorites') {
      updateSettings({ quickSave: false, quickSaveFavorites: true });
    } else if (mode === 'on') {
      updateSettings({ quickSave: true, quickSaveFavorites: false });
    }
  };

  const getQuickSaveMode = () => {
    if (settings.quickSave) return 'on';
    if (settings.quickSaveFavorites) return 'favorites';
    return 'off';
  };

  const activeMode = getQuickSaveMode();

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden p-8 select-none relative">
      
      {/* Top Header Buttons (History & About) */}
      <div className="flex items-center justify-end gap-3 mb-6">
        <button
          onClick={() => setActiveTab('history')}
          className="p-2.5 rounded-full hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors"
          title="Transfer History"
        >
          <History className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-2.5 rounded-full hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors"
          title="About AirSync"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      {/* Main Centered Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        
        {/* Pulsing circular target logo */}
        <div className="relative w-56 h-56 flex items-center justify-center mb-8">
          {/* Outer rotating dashed ring */}
          <div 
            className="absolute inset-0 rounded-full border-4 border-dashed border-blue-400/40 dark:border-blue-400/20 animate-spin" 
            style={{ animationDuration: '30s' }} 
          />
          {/* Inner rotating dashed ring */}
          <div 
            className="absolute inset-4 rounded-full border-2 border-dashed border-blue-500/30 animate-spin" 
            style={{ animationDuration: '15s', animationDirection: 'reverse' }} 
          />
          {/* Pulse Waves */}
          <div className="absolute w-36 h-36 rounded-full bg-blue-400/10 dark:bg-blue-400/5 border border-blue-400/20 animate-ping-slow" />
          
          {/* Solid blue circle */}
          <div className="w-28 h-28 rounded-full bg-blue-300 dark:bg-blue-400 flex items-center justify-center shadow-[0_0_40px_rgba(96,165,250,0.4)] relative">
            <Wifi className="w-12 h-12 text-slate-900 animate-pulse" />
          </div>
        </div>

        {/* Device Name */}
        <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          {settings.deviceName || 'Local Device'}
        </h2>
        
        {/* IP Addresses hashtag list */}
        <div className="flex items-center justify-center flex-wrap gap-2.5 mt-3 max-w-md select-text">
          {ips.map((ip, idx) => (
            <span 
              key={idx} 
              className="text-xs font-semibold px-2.5 py-1 bg-slate-200/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 rounded-lg font-mono border border-slate-300/40 dark:border-white/5 shadow-sm"
            >
              {ip}
            </span>
          ))}
        </div>

        {/* Quick Save Switcher */}
        <div className="mt-16 flex flex-col items-center gap-3">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Quick Save Mode</span>
          <div className="flex items-center bg-slate-200/50 dark:bg-slate-900/60 border border-slate-300 dark:border-white/5 rounded-full p-1 shadow-sm">
            <button
              onClick={() => handleQuickSaveChange('off')}
              className={`px-6 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                activeMode === 'off'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Off
            </button>
            <button
              onClick={() => handleQuickSaveChange('favorites')}
              className={`px-6 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                activeMode === 'favorites'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Favorites
            </button>
            <button
              onClick={() => handleQuickSaveChange('on')}
              className={`px-6 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                activeMode === 'on'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              On
            </button>
          </div>
        </div>

      </div>

      {/* Info Popup Dialog */}
      {showInfo && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-30 animate-fade-in">
          <div className="glass-card max-w-sm w-full p-6 border-slate-200 dark:border-white/10 shadow-2xl relative bg-white/95 dark:bg-slate-900/90 text-left">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              AirSync Secure Node
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-1.5">
              This node is active and waiting for file transfers on your local subnet.Senders can send files directly to you when they are on the same Wi-Fi.
            </p>
            <button
              onClick={() => setShowInfo(false)}
              className="mt-5 w-full py-2 bg-accent text-slate-950 rounded-xl text-xs font-bold hover:bg-accent-light transition-colors"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
