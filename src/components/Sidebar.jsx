import React from 'react';
import { useApp } from '../context/AppContext';
import { Wifi, Bluetooth, History, Settings, Radio } from 'lucide-react';

export default function Sidebar() {
  const { activeTab, setActiveTab, settings } = useApp();

  const menuItems = [
    { id: 'discovery', label: 'Local Discovery', icon: Wifi },
    { id: 'bluetooth', label: 'Bluetooth Share', icon: Bluetooth },
    { id: 'history', label: 'Transfer History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 glass-panel flex flex-col h-screen select-none">
      {/* App Branding */}
      <div className="p-6 flex items-center gap-3 border-b border-white/5 titlebar-drag">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-accent to-accent-light shadow-md shadow-accent/20">
          <Radio className="w-5 h-5 text-slate-950 animate-pulse" />
          <div className="absolute -inset-0.5 bg-accent rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">AirSync</span>
          <span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">File Sharing</span>
        </div>
      </div>

      {/* Navigation Buttons */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative group overflow-hidden ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {/* Highlight backdrop overlay */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-accent-light/10 border-l-[3px] border-accent rounded-r-none" />
              )}
              
              <Icon className={`w-4 h-4 z-10 transition-transform duration-300 ${
                isActive ? 'text-accent scale-110' : 'group-hover:scale-110'
              }`} />
              <span className="z-10 font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Active Device Info Footer */}
      <div className="p-4 border-t border-white/5 bg-slate-950/40">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-xs font-bold text-accent">
            {settings.deviceName ? settings.deviceName.substring(0, 2).toUpperCase() : 'ME'}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-semibold text-slate-200 truncate">{settings.deviceName}</span>
            <span className="text-[9px] text-slate-500 font-mono truncate uppercase">{settings.deviceType} Mode</span>
          </div>
        </div>
      </div>
    </div>
  );
}
