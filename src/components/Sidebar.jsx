import React from 'react';
import { useApp } from '../context/AppContext';
import { Wifi, Bluetooth, History, Settings, Send } from 'lucide-react';
import LogoIcon from '../assets/logo.png';

export default function Sidebar() {
  const { activeTab, setActiveTab, settings } = useApp();

  const menuItems = [
    { id: 'receive', label: 'Receive', icon: Wifi },
    { id: 'send', label: 'Send', icon: Send },
    { id: 'bluetooth', label: 'Bluetooth Share', icon: Bluetooth },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="hidden md:flex w-64 glass-panel flex-col h-screen select-none transition-colors duration-300">
      {/* App Branding */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-200 dark:border-white/5 titlebar-drag">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-accent dark:to-accent-light shadow-md shadow-accent/10 dark:shadow-accent/20">
          <img src={LogoIcon} className="w-6.5 h-6.5 object-contain" alt="LocalNetwork Logo" />
          <div className="absolute -inset-0.5 bg-accent rounded-xl blur opacity-10 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-100 dark:to-slate-400 bg-clip-text text-transparent">LocalNetwork</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-widest uppercase">File Sharing</span>
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
                  ? 'text-accent dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5'
              }`}
            >
              {/* Highlight backdrop overlay */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-accent/15 to-accent-light/5 dark:from-accent/20 dark:to-accent-light/10 border-l-[3px] border-accent rounded-r-none" />
              )}
              
              <Icon className={`w-4 h-4 z-10 transition-transform duration-300 ${
                isActive ? 'text-accent scale-110' : 'group-hover:scale-110'
              }`} />
              <span className="z-10 font-semibold">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Active Device Info Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-slate-950/40 transition-colors duration-300">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-200/40 dark:bg-white/5 border border-slate-200 dark:border-transparent">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-300 dark:border-white/10 flex items-center justify-center text-xs font-bold text-accent">
            {settings.deviceName ? settings.deviceName.substring(0, 2).toUpperCase() : 'ME'}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{settings.deviceName}</span>
            <span className="text-[9px] text-slate-500 font-mono truncate uppercase">{settings.deviceType} Mode</span>
          </div>
        </div>
      </div>
    </div>
  );
}
