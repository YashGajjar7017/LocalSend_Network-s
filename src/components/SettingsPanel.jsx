import React from 'react';
import { useApp } from '../context/AppContext';
import { Monitor, ShieldAlert, FolderOpen, Sliders, Palette, AppWindow, HardDrive, ToggleLeft } from 'lucide-react';

export default function SettingsPanel() {
  const { settings, updateSettings, selectDownloadsFolder } = useApp();

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

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' }
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden p-8 select-none">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Settings Panel
        </h1>
        <p className="text-sm text-slate-400 mt-1">Configure your device node settings and transfer permissions.</p>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 overflow-y-auto pr-2 pb-10 space-y-8">
        
        {/* SECTION A: GENERAL SETTINGS */}
        <div className="glass-card p-6 border-white/5 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <Sliders className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">General Settings</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Device Name Text Field */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-400">Device Name</label>
              <input
                type="text"
                value={settings.deviceName || ''}
                onChange={(e) => updateSettings({ deviceName: e.target.value })}
                className="bg-slate-950/60 border border-white/5 hover:border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all duration-300"
                placeholder="Enter node identifier..."
              />
            </div>

            {/* Accent Theme Picker */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-400">Accent Theme</label>
              <div className="flex items-center gap-3 h-full">
                {accentColors.map((color) => {
                  const isSelected = settings.accentColor === color.id;
                  return (
                    <button
                      key={color.id}
                      onClick={() => updateSettings({ accentColor: color.id })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all duration-300 border ${
                        isSelected 
                          ? 'bg-accent/15 border-accent text-white shadow-md shadow-accent/10'
                          : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${color.colorClass}`} />
                      {color.label.split(' ')[0]} {/* Grab Cyberpunk, Emerald, Electric */}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Theme Toggle Select */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-400">Theme View</label>
              <select
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value })}
                className="bg-slate-950/60 border border-white/5 hover:border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all duration-300 cursor-pointer"
              >
                {themes.map(t => (
                  <option key={t.id} value={t.id} className="bg-slate-950 text-slate-100">{t.label}</option>
                ))}
              </select>
            </div>

            {/* Language Selector Dropdown */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-400">Language (i18n)</label>
              <select
                value={settings.language}
                onChange={(e) => updateSettings({ language: e.target.value })}
                className="bg-slate-950/60 border border-white/5 hover:border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all duration-300 cursor-pointer"
              >
                {languages.map(l => (
                  <option key={l.code} value={l.code} className="bg-slate-950 text-slate-100">{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle Switches list */}
          <div className="border-t border-white/5 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Auto Start */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/30 border border-white/5">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-200">Start on Login</span>
                <span className="text-[10px] text-slate-500">Automatically boot AirSync on startup</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoStart}
                onChange={(e) => updateSettings({ autoStart: e.target.checked })}
                className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent bg-slate-900 border-white/10 cursor-pointer"
              />
            </div>

            {/* Close to Tray */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/30 border border-white/5">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-200">Close to Tray</span>
                <span className="text-[10px] text-slate-500">Minimize to system tray on exit</span>
              </div>
              <input
                type="checkbox"
                checked={settings.closeToTray}
                onChange={(e) => updateSettings({ closeToTray: e.target.checked })}
                className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent bg-slate-900 border-white/10 cursor-pointer"
              />
            </div>

            {/* Save Window Status */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/30 border border-white/5">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-200">Remember Window State</span>
                <span className="text-[10px] text-slate-500">Restores layout bounds and active tabs</span>
              </div>
              <input
                type="checkbox"
                checked={settings.saveWindowStatus}
                onChange={(e) => updateSettings({ saveWindowStatus: e.target.checked })}
                className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent bg-slate-900 border-white/10 cursor-pointer"
              />
            </div>

            {/* Animations Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/30 border border-white/5">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-200">Enable UI Animations</span>
                <span className="text-[10px] text-slate-500">Smooth sweeps, rippling, and pulses</span>
              </div>
              <input
                type="checkbox"
                checked={settings.enableAnimations}
                onChange={(e) => updateSettings({ enableAnimations: e.target.checked })}
                className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent bg-slate-900 border-white/10 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* SECTION B: RECEIVE PANEL / SECURITY SETTINGS */}
        <div className="glass-card p-6 border-white/5 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <HardDrive className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Receive Settings</h2>
          </div>

          {/* Directory Picker Row */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-400">Save received files to...</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-950/60 border border-white/5 px-4 py-2.5 rounded-xl text-xs text-slate-400 font-mono truncate select-all">
                {settings.saveFolder || 'Default Downloads Directory'}
              </div>
              <button
                onClick={selectDownloadsFolder}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 text-xs font-semibold flex items-center gap-2 hover:border-accent/40 hover:shadow-[0_0_15px_-3px_var(--color-accent-glow)] transition-all duration-300"
              >
                <FolderOpen className="w-4 h-4 text-accent" />
                Browse
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Quick Save */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/30 border border-white/5">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-200">Quick Save</span>
                <span className="text-[10px] text-slate-500">Auto-accept files from any device</span>
              </div>
              <input
                type="checkbox"
                checked={settings.quickSave}
                onChange={(e) => updateSettings({ quickSave: e.target.checked })}
                className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent bg-slate-900 border-white/10 cursor-pointer"
              />
            </div>

            {/* Quick Save to Favorites */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/30 border border-white/5">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-200">Favorites Quick Save</span>
                <span className="text-[10px] text-slate-500">Auto-route starred nodes to separate sub-folder</span>
              </div>
              <input
                type="checkbox"
                checked={settings.quickSaveFavorites}
                onChange={(e) => updateSettings({ quickSaveFavorites: e.target.checked })}
                className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent bg-slate-900 border-white/10 cursor-pointer"
              />
            </div>

            {/* Require PIN toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/30 border border-white/5">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-200">Require PIN Challenge</span>
                <span className="text-[10px] text-slate-500">Mandate passcodes to authenticate requests</span>
              </div>
              <input
                type="checkbox"
                checked={settings.requirePin}
                onChange={(e) => updateSettings({ requirePin: e.target.checked })}
                className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent bg-slate-900 border-white/10 cursor-pointer"
              />
            </div>

            {/* Auto Finish */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/30 border border-white/5">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-200">Auto Close Modals</span>
                <span className="text-[10px] text-slate-500">Close modal at 100% and notify system</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoFinish}
                onChange={(e) => updateSettings({ autoFinish: e.target.checked })}
                className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent bg-slate-900 border-white/10 cursor-pointer"
              />
            </div>

            {/* Save To History */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/30 border border-white/5 md:col-span-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-200">Log Transfers to History</span>
                <span className="text-[10px] text-slate-500">Logs file paths and sender node profiles</span>
              </div>
              <input
                type="checkbox"
                checked={settings.saveToHistory}
                onChange={(e) => updateSettings({ saveToHistory: e.target.checked })}
                className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent bg-slate-900 border-white/10 cursor-pointer"
              />
            </div>
          </div>

          {/* Active PIN Code details display */}
          {settings.requirePin && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-accent/5 border border-accent/20 animate-fade-in">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-accent animate-pulse" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-200">Active Node Passcode</span>
                  <span className="text-[10px] text-slate-400">Share this PIN with senders to link transfers</span>
                </div>
              </div>
              
              <input
                type="text"
                maxLength={6}
                value={settings.pinCode || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  updateSettings({ pinCode: val });
                }}
                className="bg-slate-950/80 border border-white/10 w-24 text-center py-1.5 font-mono font-bold tracking-widest text-accent text-sm rounded-lg focus:outline-none focus:border-accent/40"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
