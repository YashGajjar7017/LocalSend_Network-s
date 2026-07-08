import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Shield, File, Download, Upload, CheckCircle2, XCircle, RefreshCw, Smartphone, Laptop, Monitor } from 'lucide-react';

export default function TransferModal() {
  const {
    incomingTransfer,
    outgoingTransfer,
    transferProgress,
    transferStatus,
    transferError,
    respondToTransfer,
    closeTransferModal,
    settings
  } = useApp();

  const [senderPin, setSenderPin] = useState('');

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec || bytesPerSec === 0) return '0 KB/s';
    const mb = bytesPerSec / (1024 * 1024);
    if (mb >= 1) return mb.toFixed(1) + ' MB/s';
    return (bytesPerSec / 1024).toFixed(0) + ' KB/s';
  };

  const getDeviceIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'mobile':
      case 'tablet':
        return Smartphone;
      case 'laptop':
        return Laptop;
      default:
        return Monitor;
    }
  };

  const activeTransfer = incomingTransfer || outgoingTransfer;
  const isIncoming = !!incomingTransfer;

  if (!activeTransfer) return null;

  const DeviceIcon = getDeviceIcon(activeTransfer.deviceType);
  const percent = transferProgress?.percent || 0;
  const speed = transferProgress?.speed || 0;
  const bytesTransferred = transferProgress?.bytesReceived || 0;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-6 select-none animate-fade-in">
      
      {/* Glow border outline modal box */}
      <div className="glass-card max-w-md w-full border-white/10 bg-slate-900/90 shadow-2xl relative overflow-hidden">
        
        {/* Dynamic header gradient strip */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${
          transferStatus === 'error' 
            ? 'from-red-500 to-rose-600'
            : transferStatus === 'completed'
              ? 'from-emerald-500 to-green-600'
              : 'from-accent to-accent-light'
        }`} />

        <div className="p-6 flex flex-col items-center">
          
          {/* Phase 1: Authentication / Decision Stage */}
          {transferStatus === 'requesting' && (
            <div className="w-full flex flex-col items-center text-center">
              
              {/* Profile icon */}
              <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center mb-4 text-accent">
                <DeviceIcon className="w-7 h-7" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
                  {isIncoming ? <Download className="w-3.5 h-3.5 text-accent" /> : <Upload className="w-3.5 h-3.5 text-accent" />}
                </div>
              </div>

              <h2 className="text-base font-bold text-slate-100">
                {isIncoming ? 'Incoming File Request' : 'Connecting to Node'}
              </h2>
              
              <p className="text-xs text-slate-400 mt-1">
                {isIncoming 
                  ? `Device "${activeTransfer.senderName}" wants to share a file.` 
                  : `Waiting for "${activeTransfer.peer?.deviceName}" to approve...`}
              </p>

              {/* File details panel */}
              <div className="w-full bg-slate-950/50 rounded-2xl border border-white/5 p-4 my-6 flex items-center gap-3">
                <div className="p-3 bg-white/5 rounded-xl text-slate-400">
                  <File className="w-6 h-6" />
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-xs font-semibold text-slate-200 truncate">{activeTransfer.fileName}</span>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5">{formatSize(activeTransfer.size)}</span>
                </div>
              </div>

              {/* Action buttons */}
              {isIncoming ? (
                <div className="flex items-center gap-4 w-full">
                  <button
                    onClick={() => respondToTransfer(activeTransfer.transferId, false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-950 border border-white/5 text-slate-400 font-semibold text-xs hover:text-white hover:bg-slate-900 transition-colors duration-200"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => respondToTransfer(activeTransfer.transferId, true)}
                    className="flex-1 py-2.5 rounded-xl bg-accent text-slate-950 font-semibold text-xs hover:bg-accent-light shadow-md shadow-accent/20 transition-colors duration-200"
                  >
                    Accept
                  </button>
                </div>
              ) : (
                <button
                  onClick={closeTransferModal}
                  className="px-6 py-2 rounded-xl bg-slate-950 border border-white/5 text-slate-400 text-xs font-semibold hover:text-white hover:bg-slate-900 transition-colors"
                >
                  Cancel Transfer
                </button>
              )}
            </div>
          )}

          {/* Phase 2: Uploading / Transferring Stage */}
          {transferStatus === 'transferring' && (
            <div className="w-full flex flex-col items-center">
              
              <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center mb-6">
                <RefreshCw className="w-6 h-6 text-accent animate-spin" style={{ animationDuration: '4s' }} />
              </div>

              <h2 className="text-sm font-semibold text-slate-200">
                {isIncoming ? 'Receiving File' : 'Sending File'}
              </h2>
              <span className="text-xs text-slate-400 font-medium mt-1 truncate max-w-[280px]">{activeTransfer.fileName}</span>

              {/* Progress bar container */}
              <div className="w-full mt-6 mb-4">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-2">
                  <span>{percent.toFixed(0)}%</span>
                  <span>{formatSpeed(speed)}</span>
                </div>
                
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full shadow-[0_0_10px_var(--color-accent-glow)] transition-all duration-300 bg-shimmer"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-[9px] text-slate-600 font-mono mt-2">
                  <span>{formatSize(bytesTransferred)}</span>
                  <span>{formatSize(activeTransfer.size)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Phase 3: Completed Successfully Stage */}
          {transferStatus === 'completed' && (
            <div className="w-full flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
              </div>

              <h2 className="text-base font-bold text-slate-100">Transfer Completed</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Successfully {isIncoming ? 'received' : 'sent'} <strong>{activeTransfer.fileName}</strong>
              </p>

              <button
                onClick={closeTransferModal}
                className="mt-6 px-6 py-2 rounded-xl bg-slate-950 border border-white/5 text-slate-300 text-xs font-semibold hover:text-white hover:bg-slate-900 transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Phase 4: Error Stage */}
          {transferStatus === 'error' && (
            <div className="w-full flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 text-red-400">
                <XCircle className="w-8 h-8" />
              </div>

              <h2 className="text-base font-bold text-slate-100">Transfer Failed</h2>
              <p className="text-xs text-red-400 mt-1.5 px-4 font-medium leading-relaxed bg-red-500/5 py-2 border border-red-500/10 rounded-xl">
                {transferError}
              </p>

              <button
                onClick={closeTransferModal}
                className="mt-6 px-6 py-2 rounded-xl bg-slate-950 border border-white/5 text-slate-300 text-xs font-semibold hover:text-white hover:bg-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
