import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import ReceivePanel from './components/ReceivePanel';
import NetworkDiscovery from './components/NetworkDiscovery';
import BluetoothPairing from './components/BluetoothPairing';
import SettingsPanel from './components/SettingsPanel';
import TransferHistory from './components/TransferHistory';
import TransferModal from './components/TransferModal';

function MainLayout() {
  const { activeTab } = useApp();

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'receive':
        return <ReceivePanel />;
      case 'send':
        return <NetworkDiscovery />;
      case 'bluetooth':
        return <BluetoothPairing />;
      case 'history':
        return <TransferHistory />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <ReceivePanel />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#333] font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300 relative">
      
      {/* Liquid fluid background */}
      <div className="liquid-bg">
        <div className="liquid-orb liquid-orb-1" />
        <div className="liquid-orb liquid-orb-2" />
        <div className="liquid-orb liquid-orb-3" />
      </div>

      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main Content Dashboard */}
      <main className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 via-slate-100/60 to-slate-50 dark:from-[#333] dark:via-[#2a2a2a] dark:to-[#333] relative overflow-hidden transition-all duration-300">
        
        {/* Abstract futuristic background grid vectors */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#444_1px,transparent_1px),linear-gradient(to_bottom,#444_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />

        {renderActiveTab()}
      </main>

      {/* Transfer modal prompt and overlays */}
      <TransferModal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
