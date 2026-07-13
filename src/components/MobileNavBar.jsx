import React from 'react';
import { useApp } from '../context/AppContext';
import { Wifi, Bluetooth, Settings, Send } from 'lucide-react';

export default function MobileNavBar() {
  const { activeTab, setActiveTab } = useApp();

  const menuItems = [
    { id: 'receive', label: 'Receive', icon: Wifi },
    { id: 'send', label: 'Send', icon: Send },
    { id: 'bluetooth', label: 'Bluetooth', icon: Bluetooth },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-lg border-t border-slate-200 dark:border-white/5 flex justify-around items-center px-4 z-40 shadow-lg transition-colors duration-300">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center w-16 h-full transition-all duration-300 relative ${
              isActive
                ? 'text-accent dark:text-white scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {isActive && (
              <span className="absolute top-0 w-8 h-1 bg-accent rounded-full animate-pulse" />
            )}
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-accent' : ''}`} />
            <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
