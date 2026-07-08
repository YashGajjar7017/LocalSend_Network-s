import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RefreshCw, Monitor, Smartphone, Laptop, Star, Heart, Search, ShieldCheck } from 'lucide-react';

export default function NetworkDiscovery() {
  const { peers, isScanning, triggerFileSend, toggleFavorite, settings } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

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
    if (name.includes('mac') || name.includes('darwin')) return { label: 'macOS', color: 'text-slate-200' };
    if (name.includes('linux')) return { label: 'Linux', color: 'text-yellow-500' };
    if (name.includes('android')) return { label: 'Android', color: 'text-green-400' };
    if (name.includes('ios')) return { label: 'iOS', color: 'text-indigo-400' };
    return { label: 'Unknown', color: 'text-slate-400' };
  };

  const filteredPeers = peers.filter(peer => 
    peer.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    peer.ip.includes(searchTerm)
  );

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden p-8 select-none">
      {/* Title / Header Area */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Local Discovery
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Send and receive files with devices on your Wi-Fi or local network.
          </p>
        </div>

        {/* Scanning Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-white/5 text-xs text-slate-300">
            <span className={`relative flex h-2 w-2`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75`}></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            {isScanning ? 'Scanning network...' : 'Discovery active'}
          </div>
        </div>
      </div>

      {/* Search / Filters Bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by device name or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/40 border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all duration-300"
          />
        </div>
      </div>

      {/* Grid of Devices */}
      <div className="flex-1 overflow-y-auto pr-2 pb-6">
        {filteredPeers.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl bg-slate-900/10">
            <div className="relative w-16 h-16 rounded-full bg-accent/5 border border-accent/10 flex items-center justify-center mb-4">
              <div className="absolute inset-0 rounded-full animate-ping-slow bg-accent/5" />
              <RefreshCw className="w-6 h-6 text-accent/60 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <p className="text-sm text-slate-300 font-medium">Looking for active peers</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs text-center">
              Ensure the app is open on other devices connected to the same Wi-Fi subnet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPeers.map((peer) => {
              const DeviceIcon = getDeviceIcon(peer.deviceType);
              const osInfo = getOSStyle(peer.os);
              const isFavorite = settings.favorites.includes(peer.deviceId);

              return (
                <div
                  key={peer.deviceId}
                  className="glass-card hover:bg-slate-900/60 neon-border-hover p-5 flex flex-col justify-between group cursor-pointer relative overflow-hidden"
                  onClick={() => triggerFileSend(peer)}
                >
                  {/* Glass shimmer background effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="flex items-start justify-between relative z-10">
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 text-slate-300 group-hover:text-accent transition-colors duration-300">
                      <DeviceIcon className="w-6 h-6" />
                    </div>
                    
                    {/* Favorite Star Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Avoid triggering file selection
                        toggleFavorite(peer.deviceId);
                      }}
                      className="p-2 rounded-lg bg-slate-950/40 border border-white/5 text-slate-500 hover:text-yellow-400 hover:bg-slate-950 transition-colors duration-200"
                    >
                      <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </button>
                  </div>

                  <div className="mt-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100 truncate group-hover:text-white transition-colors duration-300">
                        {peer.deviceName}
                      </span>
                      {isFavorite && (
                        <ShieldCheck className="w-3.5 h-3.5 text-accent animate-pulse" />
                      )}
                    </div>
                    <span className="text-xs font-mono text-slate-500 block mt-1">{peer.ip}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 mt-5 pt-3 relative z-10 text-[10px]">
                    <span className={`font-mono uppercase font-bold tracking-wider ${osInfo.color}`}>
                      {osInfo.label}
                    </span>
                    <span className="text-slate-500 font-mono">PORT {peer.expressPort}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
