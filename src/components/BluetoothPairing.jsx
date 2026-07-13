import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Bluetooth, RefreshCw, Smartphone, Laptop, ShieldAlert, Award, 
  Headphones, Watch, File, CheckCircle2, ArrowLeft, ArrowUpRight 
} from 'lucide-react';

export default function BluetoothPairing() {
  const {
    bluetoothDevices,
    isBluetoothScanning,
    pairedBluetoothDevices,
    bluetoothHandshakeState,
    bluetoothPairingDevice,
    startBluetoothScan,
    stopBluetoothScan,
    pairBluetoothDevice,
    setBluetoothHandshakeState,
    settings
  } = useApp();

  const [verificationCode, setVerificationCode] = useState('');
  const [localReceiveCode, setLocalReceiveCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [codeStatus, setCodeStatus] = useState('idle'); // 'idle', 'connecting', 'success', 'error'
  const [codeError, setCodeError] = useState('');
  
  // Simulated transfer states
  const [transferState, setTransferState] = useState('idle'); // 'idle', 'selecting', 'sending', 'completed'
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0.0);
  const [activeDevice, setActiveDevice] = useState(null);

  const sampleFiles = [
    { name: 'Project_Overview.pdf', size: 4851200, displaySize: '4.6 MB' },
    { name: 'UI_Assets.zip', size: 67310080, displaySize: '64.2 MB' },
    { name: 'Backup_Database.db', size: 19293798, displaySize: '18.4 MB' }
  ];

  // Auto-scan on mount/tab activation
  useEffect(() => {
    startBluetoothScan();
    setLocalReceiveCode(Math.floor(200000 + Math.random() * 700000).toString());
    return () => {
      stopBluetoothScan();
    };
  }, []);

  // Generate pairing code for remote device pairing trigger
  useEffect(() => {
    if (bluetoothHandshakeState === 'pairing') {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setVerificationCode(code);
    }
  }, [bluetoothHandshakeState]);

  // Handle simulated transfer progression
  useEffect(() => {
    let timer = null;
    if (transferState === 'sending') {
      setProgress(0);
      setSpeed(1.8 + Math.random() * 2);
      
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setTransferState('completed');
            
            // Log transfer to JSON database
            if (window.electronAPI && activeDevice && selectedFile) {
              window.electronAPI.addHistoryEntry({
                fileName: selectedFile.name,
                size: selectedFile.size,
                senderDevice: 'Me',
                receiverDevice: activeDevice.name,
                status: 'Completed',
                filePath: 'C:\\Bluetooth\\' + selectedFile.name,
                direction: 'outgoing'
              });
            }
            
            // Send native notification if enabled
            if (settings.autoFinish) {
              new Notification('Bluetooth Transfer Complete', {
                body: `Successfully sent ${selectedFile.name} to ${activeDevice.name}`
              });
            }

            return 100;
          }
          setSpeed(2.0 + Math.random() * 1.5);
          return prev + Math.floor(5 + Math.random() * 8);
        });
      }, 200);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [transferState, selectedFile, activeDevice, settings.autoFinish]);

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'headphones':
        return Headphones;
      case 'watch':
        return Watch;
      case 'tablet':
      case 'mobile':
        return Smartphone;
      default:
        return Laptop;
    }
  };

  const handleDeviceClick = (device) => {
    const isPaired = pairedBluetoothDevices.includes(device.id);
    if (!isPaired) {
      pairBluetoothDevice(device);
    } else {
      setActiveDevice(device);
      setTransferState('selecting');
    }
  };

  const startSendingFile = (file) => {
    setSelectedFile(file);
    setTransferState('sending');
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    if (inputCode.length !== 6) {
      setCodeError('Code must be exactly 6 digits');
      setCodeStatus('error');
      return;
    }
    
    setCodeStatus('connecting');
    setCodeError('');
    setTimeout(() => {
      setCodeStatus('success');
      
      // Simulate receiving file via code
      setTimeout(() => {
        setActiveDevice({ id: 'bt_code_node', name: 'Code Shared Phone', type: 'mobile' });
        setSelectedFile({ name: 'Bluetooth_Document_Shared.pdf', size: 10485760, displaySize: '10.0 MB' });
        setTransferState('sending');
        setCodeStatus('idle');
        setInputCode('');
      }, 1200);
    }, 1800);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-y-auto select-none pb-20 lg:pb-0">
      
      {/* LEFT COLUMN: Animated Radar Screen */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-white/5 relative bg-slate-950/20">
        
        {/* Title area */}
        <div className="absolute top-8 left-8">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Bluetooth Sync
          </h1>
          <p className="text-xs text-slate-400 mt-1">Local backup node discovery</p>
        </div>

        {/* Outer radar frame */}
        <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full border border-white/10 flex items-center justify-center bg-slate-900/10 shadow-2xl">
          
          {/* Scanning Sweep Hand */}
          {isBluetoothScanning && (
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div 
                className="absolute top-1/2 left-1/2 w-[160px] h-[160px] md:w-[200px] md:h-[200px] bg-gradient-to-tr from-accent/20 to-transparent animate-radar-sweep origin-top-left"
                style={{ top: '0', left: '0', transformOrigin: 'bottom right' }}
              />
            </div>
          )}

          {/* Concentric rings */}
          <div className="absolute w-[80%] h-[80%] rounded-full border border-white/5 flex items-center justify-center" />
          <div className="absolute w-[60%] h-[60%] rounded-full border border-white/5 flex items-center justify-center" />
          <div className="absolute w-[40%] h-[40%] rounded-full border border-white/5 flex items-center justify-center" />
          <div className="absolute w-[20%] h-[20%] rounded-full border border-white/5 flex items-center justify-center" />
          
          {/* Radar axes */}
          <div className="absolute w-full h-[1px] bg-white/5" />
          <div className="absolute h-full w-[1px] bg-white/5" />

          {/* Central flashing bluetooth core */}
          <div className="relative w-12 h-12 rounded-full bg-slate-950/80 border border-accent/40 flex items-center justify-center shadow-lg shadow-accent/20 z-20">
            <Bluetooth className={`w-5 h-5 text-accent ${isBluetoothScanning ? 'animate-pulse' : ''}`} />
          </div>

          {/* Discoverable devices mapped onto the radar */}
          {isBluetoothScanning && bluetoothDevices.map((device, index) => {
            const angle = (device.id.charCodeAt(5) || 45) * 12; 
            const radius = 40 + (index * 20);
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;
            const isPaired = pairedBluetoothDevices.includes(device.id);

            return (
              <div
                key={device.id}
                onClick={() => handleDeviceClick(device)}
                className={`absolute w-3.5 h-3.5 rounded-full flex items-center justify-center cursor-pointer transition-all duration-500 hover:scale-125 z-30 group ${
                  isPaired ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-accent shadow-[0_0_10px_var(--color-accent-glow)]'
                }`}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                }}
              >
                <div className={`absolute -inset-2 rounded-full animate-ping ${isPaired ? 'bg-emerald-500/20' : 'bg-accent/20'}`} />
                
                {/* Tooltip on Hover */}
                <div className="absolute bottom-full mb-2 bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap">
                  {device.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scan Actions */}
        <div className="absolute bottom-8 flex gap-4">
          {!isBluetoothScanning ? (
            <button
              onClick={startBluetoothScan}
              className="px-6 py-2 rounded-xl bg-accent text-slate-950 text-xs font-semibold hover:bg-accent-light shadow-md shadow-accent/20 transition-all duration-300 animate-pulse"
            >
              Start Bluetooth Scan
            </button>
          ) : (
            <button
              onClick={stopBluetoothScan}
              className="px-6 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-all duration-300"
            >
              Stop Scanning
            </button>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Device List / Handshake / Transfer Simulator */}
      <div className="w-full lg:w-1/2 flex flex-col p-6 lg:p-8 bg-slate-950/40 min-h-[450px]">
        
        {/* VIEW 1: Idle list */}
        {bluetoothHandshakeState === 'idle' && transferState === 'idle' && (
          <div className="flex-1 flex flex-col h-full">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">
              Discovered Peripherals
            </h2>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[250px] min-h-[120px]">
              {bluetoothDevices.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                  <p className="text-xs">No bluetooth devices discoverable.</p>
                  <p className="text-[10px] mt-1 max-w-xs text-slate-600">
                    Click 'Start Bluetooth Scan' on the left to request scanning updates.
                  </p>
                </div>
              ) : (
                bluetoothDevices.map((device) => {
                  const DeviceIcon = getDeviceIcon(device.type);
                  const isPaired = pairedBluetoothDevices.includes(device.id);

                  return (
                    <div
                      key={device.id}
                      className="glass-card hover:bg-slate-900/60 p-4 flex items-center justify-between border-white/5 hover:border-accent/20 transition-all duration-300 cursor-pointer"
                      onClick={() => handleDeviceClick(device)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-slate-950 rounded-xl border border-white/5 text-slate-400">
                          <DeviceIcon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-200">{device.name}</span>
                          <span className="text-[9px] text-slate-500 font-mono mt-0.5">{device.id}</span>
                        </div>
                      </div>

                      {isPaired ? (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 px-2 py-1 rounded-md uppercase tracking-wider">
                          Ready
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            pairBluetoothDevice(device);
                          }}
                          className="text-[9px] bg-accent/10 hover:bg-accent text-accent hover:text-slate-950 font-bold border border-accent/20 hover:border-transparent px-2.5 py-1 rounded-md uppercase tracking-wider transition-colors duration-200"
                        >
                          Pair
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bluetooth Code Share panel */}
            <div className="glass-card p-4 border-white/5 bg-slate-900/60 mt-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-accent uppercase tracking-widest">Receive via Code</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-accent/15 border border-accent/30 text-accent rounded-md">
                  Active
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Your Receive Code</span>
                  <span className="text-sm font-mono font-bold tracking-widest text-accent">{localReceiveCode}</span>
                </div>
                <form onSubmit={handleCodeSubmit} className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Enter Sender's 6-Digit Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        required
                        placeholder="e.g. 524981"
                        value={inputCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setInputCode(val);
                        }}
                        className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 font-mono text-center font-bold text-sm text-white tracking-widest focus:outline-none focus:border-accent/40"
                      />
                      <button
                        type="submit"
                        disabled={codeStatus === 'connecting'}
                        className="px-4 py-1.5 bg-accent text-slate-950 rounded-xl text-xs font-bold hover:bg-accent-light transition-colors disabled:opacity-50 shrink-0"
                      >
                        {codeStatus === 'connecting' ? 'Linking...' : 'Connect'}
                      </button>
                    </div>
                  </div>
                  {codeStatus === 'error' && (
                    <div className="text-[10px] text-red-400 font-semibold bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                      {codeError}
                    </div>
                  )}
                  {codeStatus === 'success' && (
                    <div className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-center animate-pulse">
                      Code Verified! Establishing link...
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Bluetooth Handshake in Progress */}
        {bluetoothHandshakeState !== 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 border border-white/5 rounded-2xl bg-slate-900/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-accent/5 rounded-full blur-3xl animate-pulse" />

            {bluetoothHandshakeState === 'pairing' && (
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mb-6">
                  <RefreshCw className="w-6 h-6 text-accent animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                
                <h3 className="text-sm font-semibold text-slate-200">Pairing Handshake</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Validating encryption channels with <strong>{bluetoothPairingDevice?.name}</strong>...
                </p>

                <div className="mt-6 bg-slate-950/80 border border-white/10 px-6 py-3 rounded-2xl font-mono text-2xl font-bold tracking-widest text-accent shadow-inner">
                  {verificationCode}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  Verify this authentication key matches the pin on your device.
                </p>
              </div>
            )}

            {bluetoothHandshakeState === 'success' && (
              <div className="flex flex-col items-center text-center relative z-10 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6">
                  <Award className="w-6 h-6 text-emerald-400 animate-bounce" />
                </div>
                
                <h3 className="text-sm font-semibold text-slate-200">Pairing Succeeded</h3>
                <p className="text-xs text-slate-500 mt-1">
                  <strong>{bluetoothPairingDevice?.name}</strong> has been linked as a backup node.
                </p>
              </div>
            )}
            
            {bluetoothHandshakeState === 'failed' && (
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
                  <ShieldAlert className="w-6 h-6 text-red-400" />
                </div>
                
                <h3 className="text-sm font-semibold text-slate-200">Handshake Rejected</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Pair challenge code could not be verified by the peripheral device.
                </p>
                
                <button
                  onClick={() => setBluetoothHandshakeState('idle')}
                  className="mt-6 px-4 py-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors duration-200"
                >
                  Back to List
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: Paired Device File Selector */}
        {transferState === 'selecting' && activeDevice && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex items-center gap-2 mb-6">
              <button 
                onClick={() => setTransferState('idle')}
                className="p-2 rounded-lg bg-slate-900 border border-white/5 text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xs font-bold text-accent uppercase tracking-widest">Share to Node</h2>
                <span className="text-sm font-bold text-slate-200 block">{activeDevice.name}</span>
              </div>
            </div>

            <span className="text-xs text-slate-400 mb-4 block font-medium">Select a file to transfer over Bluetooth:</span>

            <div className="flex-1 space-y-3 overflow-y-auto pr-2">
              {sampleFiles.map((file) => (
                <div
                  key={file.name}
                  onClick={() => startSendingFile(file)}
                  className="glass-card hover:bg-slate-900/60 p-4 border-white/5 hover:border-accent/20 transition-all duration-300 cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-950 rounded-xl border border-white/5 text-slate-400 group-hover:text-accent transition-colors">
                      <File className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-200">{file.name}</span>
                      <span className="text-[9px] text-slate-500 mt-0.5">{file.displaySize}</span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 4: In-flight Transfer progress */}
        {transferState === 'sending' && selectedFile && activeDevice && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 border border-white/5 rounded-2xl bg-slate-900/10 shadow-2xl relative">
            <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center mb-6">
              <RefreshCw className="w-6 h-6 text-accent animate-spin" style={{ animationDuration: '3s' }} />
            </div>

            <h3 className="text-sm font-semibold text-slate-200">Bluetooth Transferring</h3>
            <span className="text-xs text-slate-500 font-mono mt-1">{selectedFile.name}</span>

            {/* Circular Progress Bar overlay */}
            <div className="w-full mt-8 mb-6 px-4">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-2">
                <span>{progress}%</span>
                <span>{speed.toFixed(1)} MB/s</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full shadow-[0_0_10px_var(--color-accent-glow)] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-600 block mt-2 text-center">
                Protocol: Bluetooth 5.2 LE Encrypted Channels
              </span>
            </div>
          </div>
        )}

        {/* VIEW 5: Completed successfully */}
        {transferState === 'completed' && selectedFile && activeDevice && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 border border-white/5 rounded-2xl bg-slate-900/10 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>

            <h3 className="text-sm font-semibold text-slate-200">File Sent Successfully</h3>
            <p className="text-xs text-slate-500 mt-1.5 text-center px-4 leading-relaxed">
              <strong>{selectedFile.name}</strong> was delivered to <strong>{activeDevice.name}</strong>.
            </p>

            <div className="mt-8 flex gap-4 w-full px-6">
              <button
                onClick={() => setTransferState('selecting')}
                className="flex-1 py-2 rounded-xl bg-slate-950 border border-white/5 text-slate-400 text-xs font-semibold hover:text-white hover:bg-slate-900 transition-colors"
              >
                Send Another
              </button>
              <button
                onClick={() => {
                  setTransferState('idle');
                  setActiveDevice(null);
                }}
                className="flex-1 py-2 rounded-xl bg-accent text-slate-950 text-xs font-semibold hover:bg-accent-light shadow-md shadow-accent/20 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
