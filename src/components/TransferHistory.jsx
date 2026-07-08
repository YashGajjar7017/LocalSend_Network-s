import React from 'react';
import { useApp } from '../context/AppContext';
import { Trash2, FolderOpen, ArrowDownLeft, ArrowUpRight, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export default function TransferHistory() {
  const { history, clearHistory } = useApp();

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Unknown';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return (
          <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </div>
        );
      case 'Failed':
        return (
          <div className="flex items-center gap-1.5 text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <XCircle className="w-3 h-3" />
            Failed
          </div>
        );
      case 'Declined':
      default:
        return (
          <div className="flex items-center gap-1.5 text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <AlertTriangle className="w-3 h-3" />
            Declined
          </div>
        );
    }
  };

  const handleOpenFolder = (filePath) => {
    if (window.electronAPI) {
      window.electronAPI.openFolder(filePath);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden p-8 select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Transfer History
          </h1>
          <p className="text-sm text-slate-400 mt-1">Logs of completed, declined, and failed transfers.</p>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-white/5 hover:border-red-500/20 text-slate-400 hover:text-red-400 text-xs font-semibold flex items-center gap-2 transition-all duration-300"
          >
            <Trash2 className="w-4 h-4" />
            Clear Log
          </button>
        )}
      </div>

      {/* Main History Table / List */}
      <div className="flex-1 overflow-y-auto pr-2 pb-6">
        {history.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl bg-slate-900/10">
            <p className="text-sm text-slate-500 font-medium">History log is empty</p>
            <p className="text-xs text-slate-600 mt-1 max-w-xs text-center">
              Successfully completed and declined files will be cataloged here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => {
              const isIncoming = item.direction === 'incoming';
              const DirectionIcon = isIncoming ? ArrowDownLeft : ArrowUpRight;
              const hasFile = item.status === 'Completed' && item.filePath;

              return (
                <div
                  key={item.id}
                  className="glass-card hover:bg-slate-900/60 p-4 border-white/5 flex items-center justify-between hover:border-white/10 transition-all duration-200"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                    {/* Direction icon badge */}
                    <div className={`p-2.5 rounded-xl border border-white/5 ${
                      isIncoming 
                        ? 'bg-blue-500/10 text-blue-400' 
                        : 'bg-accent/10 text-accent'
                    }`}>
                      <DirectionIcon className="w-4 h-4" />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-slate-200 truncate" title={item.fileName}>
                        {item.fileName}
                      </span>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-mono">
                        <span>{formatSize(item.size)}</span>
                        <span>•</span>
                        <span>
                          {isIncoming ? `From: ${item.senderDevice}` : `To: ${item.receiverDevice}`}
                        </span>
                        <span>•</span>
                        <span>{formatDate(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {getStatusBadge(item.status)}
                    
                    {hasFile ? (
                      <button
                        onClick={() => handleOpenFolder(item.filePath)}
                        className="p-2 rounded-lg bg-slate-950/40 border border-white/5 text-slate-400 hover:text-accent hover:bg-slate-950 transition-colors duration-200"
                        title="Open File Folder"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="w-8" /> // spacing spacer
                    )}
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
