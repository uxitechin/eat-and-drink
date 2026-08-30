// Bluetooth Thermal Printer Driver for ESC/POS POS-58 / POS-80 Printers
// Features: One-Time Device Setup, Silent Auto-Reconnect, MTU Chunked Binary Writer

const PRINTER_STORAGE_KEY = 'eat_drink_device_printer_config';

// Common Bluetooth Thermal Printer Service UUIDs
const KNOWN_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Printer Service
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / CC2541 Serial
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent Serial
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Nordic UART Service
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic SPP
  '0000ff00-0000-1000-8000-00805f9b34fb', // Custom POS Service
  '0000ae00-0000-1000-8000-00805f9b34fb', // Portable POS Receipt Service
  '0000ff02-0000-1000-8000-00805f9b34fb'
];

class BluetoothPrinterManager {
  constructor() {
    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.status = 'unconfigured'; // 'unconfigured', 'connected', 'reconnecting', 'offline'
    this.listeners = new Set();
  }

  // Subscribe to connection status changes
  onStatusChange(callback) {
    this.listeners.add(callback);
    callback(this.getStatus());
    return () => this.listeners.delete(callback);
  }

  notifyStatus(status) {
    this.status = status;
    this.listeners.forEach(cb => {
      try { cb(status); } catch (e) {}
    });
  }

  getStatus() {
    const saved = this.getSavedConfig();
    if (!saved) return 'unconfigured';
    if (this.server && this.server.connected) return 'connected';
    return this.status;
  }

  // Get locally saved printer config for this specific device
  getSavedConfig() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const data = localStorage.getItem(PRINTER_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  // Save device-specific printer configuration
  saveConfig(config) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify({
        ...config,
        savedAt: Date.now()
      }));
    } catch (e) {}
  }

  // Forget saved printer
  forgetPrinter() {
    if (this.device && this.server && this.server.connected) {
      try { this.device.gatt.disconnect(); } catch (e) {}
    }
    this.device = null;
    this.server = null;
    this.characteristic = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(PRINTER_STORAGE_KEY);
    }
    this.notifyStatus('unconfigured');
  }

  // Is Web Bluetooth API supported by this browser/OS
  isWebBluetoothSupported() {
    return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth);
  }

  // ONE-TIME SETUP: User clicks "Connect Bluetooth Printer" -> Browser shows picker
  async pairNewPrinter(paperWidth = '80mm') {
    if (!this.isWebBluetoothSupported()) {
      throw new Error('Web Bluetooth is not supported on this browser. Please use Chrome or Edge on Android / Windows.');
    }

    this.notifyStatus('reconnecting');

    try {
      // Request device with all standard POS printer filters & optional services
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_PRINTER_SERVICES
      });

      if (!device) {
        throw new Error('No printer device selected.');
      }

      this.device = device;
      this.setupDeviceListeners(device);

      // Connect to GATT Server
      const characteristic = await this.connectGatt(device);
      this.characteristic = characteristic;

      // Save device configuration locally
      const config = {
        id: device.id,
        name: device.name || 'Bluetooth POS Printer',
        paperWidth,
        connectionType: 'bluetooth_ble',
        lastConnectedAt: Date.now()
      };
      this.saveConfig(config);
      this.notifyStatus('connected');

      return config;
    } catch (err) {
      this.notifyStatus(this.getSavedConfig() ? 'offline' : 'unconfigured');
      throw err;
    }
  }

  // Auto-discover writable characteristic from GATT services
  async connectGatt(device) {
    if (!device.gatt) {
      throw new Error('Device does not support GATT server.');
    }

    const server = await device.gatt.connect();
    this.server = server;

    // Scan for available services
    const services = await server.getPrimaryServices().catch(() => []);
    if (services.length === 0) {
      throw new Error('Could not discover Bluetooth printer services.');
    }

    let writeChar = null;

    // Search for a writable characteristic
    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          const props = char.properties;
          if (props.write || props.writeWithoutResponse) {
            writeChar = char;
            break;
          }
        }
      } catch (e) {}
      if (writeChar) break;
    }

    if (!writeChar) {
      throw new Error('No writable ESC/POS characteristic found on this printer.');
    }

    return writeChar;
  }

  // Setup disconnect event handler
  setupDeviceListeners(device) {
    device.addEventListener('gattserverdisconnected', () => {
      this.server = null;
      this.characteristic = null;
      this.notifyStatus('offline');
    });
  }

  // SILENT AUTOMATIC RECONNECT: Uses getDevices() if available, or reconnects cached device
  async autoReconnect() {
    const saved = this.getSavedConfig();
    if (!saved) {
      this.notifyStatus('unconfigured');
      return null;
    }

    // Already connected
    if (this.server && this.server.connected && this.characteristic) {
      this.notifyStatus('connected');
      return this.characteristic;
    }

    // If device object exists in memory, reconnect directly
    if (this.device && this.device.gatt) {
      try {
        this.notifyStatus('reconnecting');
        const char = await this.connectGatt(this.device);
        this.characteristic = char;
        this.notifyStatus('connected');
        return char;
      } catch (e) {
        this.notifyStatus('offline');
        return null;
      }
    }

    // Try navigator.bluetooth.getDevices() (Supported in modern Chrome)
    if (navigator.bluetooth && navigator.bluetooth.getDevices) {
      try {
        this.notifyStatus('reconnecting');
        const devices = await navigator.bluetooth.getDevices();
        const matching = devices.find(d => d.id === saved.id || d.name === saved.name);
        if (matching) {
          this.device = matching;
          this.setupDeviceListeners(matching);
          const char = await this.connectGatt(matching);
          this.characteristic = char;
          this.notifyStatus('connected');
          return char;
        }
      } catch (e) {}
    }

    this.notifyStatus('offline');
    return null;
  }

  // MTU-Safe Chunked Binary Writer: Slices binary payload into chunks with small pauses
  async writeBinaryChunks(bytes, chunkSize = 64, delayMs = 15) {
    let char = this.characteristic;

    // If not connected, attempt auto-reconnect once
    if (!char || !this.server || !this.server.connected) {
      char = await this.autoReconnect();
    }

    if (!char) {
      throw new Error('PRINTER_OFFLINE');
    }

    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const totalBytes = data.length;

    for (let offset = 0; offset < totalBytes; offset += chunkSize) {
      const slice = data.slice(offset, offset + chunkSize);
      if (char.properties.writeWithoutResponse) {
        await char.writeValueWithoutResponse(slice);
      } else {
        await char.writeValue(slice);
      }
      if (delayMs > 0 && offset + chunkSize < totalBytes) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    return true;
  }
}

// Singleton Instance for the entire POS application
export const bluetoothPrinter = new BluetoothPrinterManager();
