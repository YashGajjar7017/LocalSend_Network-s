import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sliders,
  HardDrive,
  FolderOpen,
  ShieldAlert,
  Server,
  Monitor,
  Laptop,
  Smartphone,
  Network,
  Lock,
  Globe,
  Github,
  Info,
  Heart,
  FileText,
  RefreshCw,
  Play,
  Square,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function SettingsPanel() {
  const {
    settings,
    updateSettings,
    selectDownloadsFolder,
    githubUser,
    serverState,
    networkInfo,
    loginGitHub,
    logoutGitHub,
    stopServer,
    startServer,
    restartServer
  } = useApp();

  // Expanded states for other section cards
  const [expandAbout, setExpandAbout] = useState(false);
  const [expandSupport, setExpandSupport] = useState(false);
  const [expandPrivacy, setExpandPrivacy] = useState(false);

  const themes = [
    { id: 'dark', label: 'Dark Mode' },
    { id: 'light', label: 'Light Mode' },
    { id: 'system', label: 'System Default' }
  ];

  const accentColors = [
    { id: 'cyberpunk', label: 'Cyberpunk Purple', colorClass: 'bg-violet-600' },
    { id: 'emerald', label: 'Emerald Green', colorClass: 'bg-emerald-500' },
    { id: 'electric', label: 'Electric Blue', colorClass: 'bg-blue-500' }
  ];

  const deviceTypes = [
    { id: 'desktop', label: 'Desktop' },
    { id: 'laptop', label: 'Laptop' },
    { id: 'mobile', label: 'Mobile' },
    { id: 'tablet', label: 'Tablet' }
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden p-8 select-none">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
          Settings Panel
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure your network transfer node, visual theme, and integration services.</p>
      </div>

      {/* Settings Rows List */}
      <div className="flex-1 overflow-y-auto pr-2 pb-10 space-y-6">

        {/* SECTION 1: GITHUB INTEGRATION */}
        <div className="glass-card p-6 border-slate-200/50 dark:border-white/5 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200/50 dark:border-white/5 pb-3">
            <Github className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">GitHub Connection</h2>
          </div>

          <div className="flex flex-col gap-4">
            {githubUser ? (
              <div className="flex items-center justify-between p-4 rounded-xl bg-accent/5 border border-accent/20">
                <div className="flex items-center gap-3">
                  <img
                    src={githubUser.avatar_url}
                    alt="GitHub Avatar"
                    className="w-10 h-10 rounded-full border border-accent/40"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{githubUser.name || githubUser.username}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Signed in via GitHub • Fast-Path Tunnel Enabled (+250%)</span>
                  </div>
                </div>
                <button
                  onClick={logoutGitHub}
                  className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 text-xs font-semibold transition-colors duration-200"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between py-2.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">GitHub Link Sharing</span>
                  <span className="text-[10px] text-slate-500">Sign in to share files via web links and speed up transfers</span>
                </div>
                <button
                  onClick={loginGitHub}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 border border-slate-800 dark:border-white text-xs font-semibold flex items-center gap-2 transition-all duration-300 hover:shadow-md"
                >
                  <Github className="w-4 h-4" />
                  Sign In with GitHub
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: GENERAL SETTINGS */}
        <div className="glass-card p-6 border-slate-200/50 dark:border-white/5 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200/50 dark:border-white/5 pb-3">
            <Sliders className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">General Settings</h2>
          </div>

          <div className="flex flex-col divide-y divide-slate-200/50 dark:divide-white/5">
            {/* Theme Select */}
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Theme View</span>
                <span className="text-[10px] text-slate-500">Choose between light, dark, or system preferences</span>
              </div>
              <select
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value })}
                className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-white/5 hover:border-slate-400 dark:hover:border-white/10 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-accent/40 transition-all duration-300 cursor-pointer w-48"
              >
                {themes.map(t => (
                  <option key={t.id} value={t.id} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">{t.label}</option>
                ))}
              </select>
            </div>

            {/* Accent Theme Color */}
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Accent Theme Color</span>
                <span className="text-[10px] text-slate-500">Pick matching highlights for buttons, badges and lines</span>
              </div>
              <div className="flex items-center gap-2">
                {accentColors.map((color) => {
                  const isSelected = settings.accentColor === color.id;
                  return (
                    <button
                      key={color.id}
                      onClick={() => updateSettings({ accentColor: color.id })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all duration-300 border ${
                        isSelected 
                          ? 'bg-accent/15 border-accent text-accent dark:text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${color.colorClass}`} />
                      {color.label.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Auto Start */}
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Start on Login</span>
                <span className="text-[10px] text-slate-500">Automatically boot AirSync on system startup</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoStart}
                onChange={(e) => updateSettings({ autoStart: e.target.checked })}
                className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-white/10 cursor-pointer"
              />
            </div>

            {/* Close to Tray */}
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Close to Tray</span>
                <span className="text-[10px] text-slate-500">Minimize application to tray on window exit</span>
              </div>
              <input
                type="checkbox"
                checked={settings.closeToTray}
                onChange={(e) => updateSettings({ closeToTray: e.target.checked })}
                className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-white/10 cursor-pointer"
              />
            </div>

            {/* Animations Switch */}
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Enable UI Animations</span>
                <span className="text-[10px] text-slate-500">Smooth sweeps, rippling pulses and sliding transitions</span>
              </div>
              <input
                type="checkbox"
                checked={settings.enableAnimations}
                onChange={(e) => updateSettings({ enableAnimations: e.target.checked })}
                className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-white/10 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: RECEIVE SETTINGS */}
        <div className="glass-card p-6 border-slate-200/50 dark:border-white/5 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200/50 dark:border-white/5 pb-3">
            <HardDrive className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Receive Settings</h2>
          </div>

          <div className="flex flex-col divide-y divide-slate-200/50 dark:divide-white/5">
            {/* Save Directory picker */}
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5 max-w-md">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Save Folder Directory</span>
                <span className="text-[10px] text-slate-500 font-mono truncate max-w-sm block">
                  {settings.saveFolder || 'Default Downloads Directory'}
                </span>
              </div>
              <button
                onClick={selectDownloadsFolder}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 hover:border-accent/40 transition-all duration-300"
              >
                <FolderOpen className="w-4 h-4 text-accent" />
                Browse
              </button>
            </div>

            {/* Quick Save toggle */}
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Quick Save</span>
                <span className="text-[10px] text-slate-500">Auto-accept files from all detected devices</span>
              </div>
              <input
                type="checkbox"
                checked={settings.quickSave}
                onChange={(e) => updateSettings({ quickSave: e.target.checked })}
                className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-white/10 cursor-pointer"
              />
            </div>

            {/* Auto Accept in Link Share Mode */}
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Auto Accept Share-via-Link Requests</span>
                <span className="text-[10px] text-slate-500">Automatically accept files sent via link shares</span>
              </div>
              <input
                type="checkbox"
                checked={settings.shareViaLinkAutoAccept}
                onChange={(e) => updateSettings({ shareViaLinkAutoAccept: e.target.checked })}
                className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-white/10 cursor-pointer"
              />
            </div>

            {/* PIN challenge */}
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">PIN Challenge Access</span>
                <span className="text-[10px] text-slate-500">Force passcodes to verify secure pairings</span>
              </div>
              <input
                type="checkbox"
                checked={settings.requirePin}
                onChange={(e) => updateSettings({ requirePin: e.target.checked })}
                className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-white/10 cursor-pointer"
              />
            </div>

            {settings.requirePin && (
              <div className="flex items-center justify-between py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Passcode PIN</span>
                  <span className="text-[10px] text-slate-500">Active verification PIN</span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={settings.pinCode || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    updateSettings({ pinCode: val });
                  }}
                  className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-white/10 w-24 text-center py-1.5 font-mono font-bold tracking-widest text-accent text-sm rounded-lg focus:outline-none focus:border-accent/40"
                />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: NETWORK SETTINGS */}
        <div className="glass-card p-6 border-slate-200/50 dark:border-white/5 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200/50 dark:border-white/5 pb-3">
            <Network className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Network Settings</h2>
          </div>

          <div className="flex flex-col divide-y divide-slate-200/50 dark:divide-white/5">
            {/* Server Stop & Restart Control */}
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-bold">Node Web Server</span>
                <span className="text-[10px] flex items-center gap-2">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                    serverState === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                  }`} />
                  <span className="text-slate-500 font-medium">Status: {serverState.toUpperCase()}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                {serverState === 'running' ? (
                  <button
                    onClick={stopServer}
                    className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all duration-200"
                  >
                    <Square className="w-3.5 h-3.5 fill-red-500" />
                    Stop Server
                  </button>
                ) : (
                  <button
                    onClick={startServer}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all duration-200"
                  >
                    <Play className="w-3.5 h-3.5 fill-emerald-500" />
                    Start Server
                  </button>
                )}
                <button
                  onClick={restartServer}
                  className="px-3.5 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 text-xs font-semibold flex items-center gap-1.5 transition-all duration-200"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Restart
                </button>
              </div>
            </div>

            {/* Device Name input */}
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Device Node Name</span>
                <span className="text-[10px] text-slate-500">Hostname broadcasted to peers</span>
              </div>
              <input
                type="text"
                value={settings.deviceName || ''}
                onChange={(e) => updateSettings({ deviceName: e.target.value })}
                className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-white/5 hover:border-slate-400 dark:hover:border-white/10 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-accent/40 w-56"
                placeholder="Enter host name..."
              />
            </div>

            {/* Device Type select */}
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Device Type</span>
                <span className="text-[10px] text-slate-500">Visual icon shown for your device</span>
              </div>
              <select
                value={settings.deviceType || 'desktop'}
                onChange={(e) => updateSettings({ deviceType: e.target.value })}
                className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-white/5 hover:border-slate-400 dark:hover:border-white/10 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-accent/40 w-56 cursor-pointer"
              >
                {deviceTypes.map(type => (
                  <option key={type.id} value={type.id} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">{type.label}</option>
                ))}
              </select>
            </div>

            {/* Device Model input */}
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Device Model</span>
                <span className="text-[10px] text-slate-500">Hardware model descriptor details</span>
              </div>
              <input
                type="text"
                value={settings.deviceModel || ''}
                onChange={(e) => updateSettings({ deviceModel: e.target.value })}
                className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-white/5 hover:border-slate-400 dark:hover:border-white/10 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-accent/40 w-56"
                placeholder="e.g. MacBook Pro, Dell XPS"
              />
            </div>

            {/* Port NO input */}
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-bold">Server Port Number</span>
                <span className="text-[10px] text-slate-500">Bind port for local HTTP file streams</span>
              </div>
              <input
                type="number"
                value={settings.port || 53343}
                onChange={(e) => updateSettings({ port: parseInt(e.target.value) || 53343 })}
                className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-white/5 hover:border-slate-400 dark:hover:border-white/10 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-accent/40 w-32"
              />
            </div>

            {/* Network interfaces info display */}
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5 max-w-sm">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Local Network Adaptors</span>
                <span className="text-[10px] text-slate-500 truncate block font-mono max-w-xs">{networkInfo}</span>
              </div>
              <span className="text-[10px] px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 rounded-lg select-all max-w-[200px] truncate font-mono">
                {networkInfo.split(',')[0]}
              </span>
            </div>

            {/* Discovery Timeout input */}
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-bold">Discovery Timeout (sec)</span>
                <span className="text-[10px] text-slate-500">Automatically stop scan search to save battery</span>
              </div>
              <input
                type="number"
                value={settings.discoveryTimeout || 500}
                onChange={(e) => updateSettings({ discoveryTimeout: parseInt(e.target.value) || 500 })}
                className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-white/5 hover:border-slate-400 dark:hover:border-white/10 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-accent/40 w-32"
              />
            </div>

            {/* Encryption toggle */}
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-bold">Transfer Encryption</span>
                <span className="text-[10px] text-slate-500">Protect transfer payloads using local key cyphers</span>
              </div>
              <input
                type="checkbox"
                checked={settings.encryptionEnabled}
                onChange={(e) => updateSettings({ encryptionEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-white/10 cursor-pointer"
              />
            </div>

            {/* Multicast address input */}
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-bold">Multicast IP Group</span>
                <span className="text-[10px] text-slate-500">IP address group used for active discovery broadcasts</span>
              </div>
              <input
                type="text"
                value={settings.multicastAddress || '224.0.0.167'}
                onChange={(e) => updateSettings({ multicastAddress: e.target.value })}
                className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-white/5 hover:border-slate-400 dark:hover:border-white/10 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-accent/40 w-56 font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: OTHER SETTINGS (About, Support, Privacy Policy) */}
        <div className="glass-card p-6 border-slate-200/50 dark:border-white/5 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200/50 dark:border-white/5 pb-3">
            <Info className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Other Settings</h2>
          </div>

          <div className="flex flex-col divide-y divide-slate-200/50 dark:divide-white/5">
            {/* About LocalNetwork */}
            <div className="flex flex-col py-3">
              <button
                onClick={() => setExpandAbout(!expandAbout)}
                className="flex items-center justify-between w-full hover:text-accent transition-colors duration-200"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <Info className="w-4 h-4 text-slate-500" />
                  About LocalNetwork
                </div>
                {expandAbout ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>
              {expandAbout && (
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-100 dark:bg-slate-950/40 p-4 border border-slate-200 dark:border-white/5 rounded-xl animate-fade-in space-y-2">
                  <p><strong>AirSync LocalNetwork v1.0.0</strong></p>
                  <p>
                    AirSync is a secure, high-speed, cross-platform file sharing desktop application designed to run completely on your local area network (LAN) without requiring active internet connections.
                  </p>
                  <p>
                    Using lightweight HTTP peer streams and high-velocity UDP network discovery, AirSync eliminates file size barriers and cloud latency. Secure encryption tunnels block interception, keeping your personal folders fully isolated.
                  </p>
                </div>
              )}
            </div>

            {/* Support LocalNetwork */}
            <div className="flex flex-col py-3">
              <button
                onClick={() => setExpandSupport(!expandSupport)}
                className="flex items-center justify-between w-full hover:text-accent transition-colors duration-200"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <Heart className="w-4 h-4 text-slate-500" />
                  Support LocalNetwork
                </div>
                {expandSupport ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>
              {expandSupport && (
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-100 dark:bg-slate-950/40 p-4 border border-slate-200 dark:border-white/5 rounded-xl animate-fade-in space-y-2">
                  <p><strong>Support Open Source Development</strong></p>
                  <p>
                    LocalNetwork (AirSync) is a completely open-source project created and maintained by a dedicated developer community. We charge zero licensing fees and carry no trackers or advertisements.
                  </p>
                  <p>
                    If this application speeds up your daily pipeline, please consider sharing the software with your peers, contributing code fixes on GitHub, or sponsoring development resources to help keep this tool free!
                  </p>
                </div>
              )}
            </div>

            {/* Privacy Policy */}
            <div className="flex flex-col py-3">
              <button
                onClick={() => setExpandPrivacy(!expandPrivacy)}
                className="flex items-center justify-between w-full hover:text-accent transition-colors duration-200"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Privacy Policy
                </div>
                {expandPrivacy ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>
              {expandPrivacy && (
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-100 dark:bg-slate-950/40 p-4 border border-slate-200 dark:border-white/5 rounded-xl animate-fade-in space-y-2 font-mono">
                  <p><strong>Privacy Shield Policy</strong></p>
                  <p>
                    1. DATA ISOLATION: AirSync never uploads files, telemetry, database settings, or connection records to outer servers. Files remain strictly on your local subnet nodes.
                  </p>
                  <p>
                    2. ENCRYPTION KEYS: Secure local encryption keys are generated entirely in RAM and are never recorded on disk or external servers.
                  </p>
                  <p>
                    3. GITHUB AUTHENTICATION: When using GitHub Link Sharing, only your basic public avatar and login name are fetched to identify your links. We never store repository permissions or code access tokens.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
