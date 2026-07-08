const dgram = require('dgram');
const os = require('os');
const EventEmitter = require('events');

class UDPDiscovery extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 53344;
    this.deviceId = options.deviceId || 'device_' + Math.random().toString(36).substr(2, 9);
    this.deviceName = options.deviceName || os.hostname();
    this.deviceType = options.deviceType || (os.platform() === 'win32' || os.platform() === 'darwin' ? 'desktop' : 'laptop');
    this.expressPort = options.expressPort || 53343;
    
    this.socket = null;
    this.peers = new Map(); // key: deviceId, value: peerInfo
    this.broadcastInterval = null;
    this.cleanupInterval = null;
    this.isScanning = false;
  }

  // Get all IPv4 local network interface addresses (excluding internal loopbacks)
  getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
      for (const netInterface of interfaces[name]) {
        // Skip internal (127.0.0.1) and non-IPv4 addresses
        if (netInterface.family === 'IPv4' && !netInterface.internal) {
          ips.push({
            address: netInterface.address,
            netmask: netInterface.netmask,
            name: name
          });
        }
      }
    }
    return ips;
  }

  // Helper to calculate broadcast address from IP and netmask
  calculateBroadcastAddress(ip, netmask) {
    const ipParts = ip.split('.').map(Number);
    const maskParts = netmask.split('.').map(Number);
    const broadcastParts = [];
    
    for (let i = 0; i < 4; i++) {
      broadcastParts.push((ipParts[i] & maskParts[i]) | (255 ^ maskParts[i]));
    }
    
    return broadcastParts.join('.');
  }

  start() {
    if (this.isScanning) return;
    
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    this.socket.on('message', (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString());
        
        // Ignore self
        if (data.deviceId === this.deviceId) return;
        
        if (data.type === 'announce') {
          const peer = {
            deviceId: data.deviceId,
            deviceName: data.deviceName,
            deviceType: data.deviceType,
            os: data.os,
            expressPort: data.expressPort,
            ip: rinfo.address,
            lastSeen: Date.now()
          };

          const isNew = !this.peers.has(peer.deviceId);
          this.peers.set(peer.deviceId, peer);
          
          if (isNew) {
            this.emit('peers-updated', this.getPeersList());
          }
        }
      } catch (err) {
        // Silently ignore corrupted UDP frames
      }
    });

    this.socket.on('error', (err) => {
      console.error('UDP Discovery socket error:', err);
      this.stop();
    });

    this.socket.bind(this.port, () => {
      try {
        this.socket.setBroadcast(true);
      } catch (e) {
        console.warn('Could not set socket broadcast, normal discovery might be impacted', e);
      }
      this.isScanning = true;
      
      // Start broadcasting presence
      this.broadcast();
      this.broadcastInterval = setInterval(() => this.broadcast(), 3000);
      
      // Periodically clean up old peers (haven't heard in 8 seconds)
      this.cleanupInterval = setInterval(() => this.cleanupPeers(), 4000);
      
      this.emit('scanning-state', true);
    });
  }

  stop() {
    if (!this.isScanning) return;

    if (this.broadcastInterval) clearInterval(this.broadcastInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {}
      this.socket = null;
    }
    
    this.isScanning = false;
    this.peers.clear();
    this.emit('peers-updated', []);
    this.emit('scanning-state', false);
  }

  broadcast() {
    if (!this.socket) return;

    const payload = JSON.stringify({
      type: 'announce',
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      deviceType: this.deviceType,
      os: os.platform(),
      expressPort: this.expressPort
    });

    const localInterfaces = this.getLocalIPs();
    
    // Broadcast on each interface's broadcast address to handle dual-band and multiple NICs
    for (const info of localInterfaces) {
      try {
        const broadcastAddr = this.calculateBroadcastAddress(info.address, info.netmask);
        const buffer = Buffer.from(payload);
        
        // Broadcast packet
        this.socket.send(buffer, 0, buffer.length, this.port, broadcastAddr);
        
        // Also send direct broadcast to local subnet defaults as safety fallbacks
        this.socket.send(buffer, 0, buffer.length, this.port, '255.255.255.255');
        
        // Subnet common default broadcast
        const subnetParts = info.address.split('.');
        subnetParts[3] = '255';
        this.socket.send(buffer, 0, buffer.length, this.port, subnetParts.join('.'));
        
      } catch (err) {
        // Capture individual socket send exceptions (e.g. interface down)
      }
    }
  }

  cleanupPeers() {
    const now = Date.now();
    let updated = false;

    for (const [id, peer] of this.peers.entries()) {
      if (now - peer.lastSeen > 8000) {
        this.peers.delete(id);
        updated = true;
      }
    }

    if (updated) {
      this.emit('peers-updated', this.getPeersList());
    }
  }

  getPeersList() {
    return Array.from(this.peers.values());
  }

  updateDeviceInfo(name, type) {
    if (name) this.deviceName = name;
    if (type) this.deviceType = type;
    this.broadcast();
  }
}

module.exports = UDPDiscovery;
