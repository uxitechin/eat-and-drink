import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Check, 
  Bluetooth, 
  BluetoothConnected, 
  BluetoothOff, 
  RefreshCw, 
  Trash2, 
  AlertCircle,
  FileText,
  Download,
  Upload,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { bluetoothPrinter, printTestReceipt } from '../services/printer';
import { exportFullDatabase, importFullDatabase } from '../services/storage';

export default function PrinterSettings({ 
  settings, 
  setSettings, 
  soundEnabled, 
  setSoundEnabled,
  onTriggerPWAInstall,
  isAppInstalled
}) {
  const [printerConfig, setPrinterConfig] = useState(bluetoothPrinter.getSavedConfig());
  const [printerStatus, setPrinterStatus] = useState(bluetoothPrinter.getStatus());
  const [paperWidth, setPaperWidth] = useState(printerConfig?.paperWidth || settings?.paperWidth || '80mm');
  
  const [isPairing, setIsPairing] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [testPrintLoading, setTestPrintLoading] = useState(false);
  const [testPrintSuccess, setTestPrintSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [dbStatus, setDbStatus] = useState('');

  // Subscribe to Bluetooth printer connection status changes
  useEffect(() => {
    const unsubscribe = bluetoothPrinter.onStatusChange((status) => {
      setPrinterStatus(status);
      setPrinterConfig(bluetoothPrinter.getSavedConfig());
    });
    return unsubscribe;
  }, []);

  // Update paper width selection locally
  const handlePaperWidthChange = (width) => {
    setPaperWidth(width);
    const updated = {
      ...(printerConfig || {}),
      paperWidth: width
    };
    if (printerConfig) {
      bluetoothPrinter.saveConfig(updated);
      setPrinterConfig(updated);
    }
    if (setSettings) {
      setSettings(prev => ({ ...prev, paperWidth: width }));
    }
  };

  // 1. One-time Setup: Pair New Bluetooth Printer
  const handleConnectPrinter = async () => {
    setIsPairing(true);
    setErrorMessage('');
    try {
      const config = await bluetoothPrinter.pairNewPrinter(paperWidth);
      setPrinterConfig(config);
      setPrinterStatus('connected');
    } catch (err) {
      console.warn('Bluetooth pairing cancelled or failed:', err);
      if (err.name !== 'NotFoundError') {
        setErrorMessage(err.message || 'Could not connect to Bluetooth printer.');
      }
    } finally {
      setIsPairing(false);
    }
  };

  // 2. Reconnect Existing Saved Printer
  const handleReconnect = async () => {
    setIsReconnecting(true);
    setErrorMessage('');
    try {
      const char = await bluetoothPrinter.autoReconnect();
      if (char) {
        setPrinterStatus('connected');
      } else {
        setErrorMessage('Printer is offline or turned off. Please ensure Bluetooth is enabled.');
      }
    } catch (err) {
      setErrorMessage('Could not reconnect to thermal printer.');
    } finally {
      setIsReconnecting(false);
    }
  };

  // 3. Disconnect / Forget Printer
  const handleForget = () => {
    bluetoothPrinter.forgetPrinter();
    setPrinterConfig(null);
    setPrinterStatus('unconfigured');
  };

  // 4. Test Print (ESC/POS Slip)
  const handleTestPrint = async () => {
    setTestPrintLoading(true);
    setErrorMessage('');
    setTestPrintSuccess(false);
    try {
      await printTestReceipt({ paperWidth });
      setTestPrintSuccess(true);
      setTimeout(() => setTestPrintSuccess(false), 3500);
    } catch (err) {
      if (err.code === 'NO_PRINTER_CONFIGURED') {
        setErrorMessage('No thermal printer is configured on this device yet. Click "Connect Bluetooth Printer" above.');
      } else if (err.code === 'PRINTER_OFFLINE') {
        setErrorMessage('Printer is offline. Please power on the printer and click "Reconnect".');
      } else {
        setErrorMessage('Test print failed: ' + (err.message || 'Check printer connection.'));
      }
    } finally {
      setTestPrintLoading(false);
    }
  };

  // Database backup handlers
  const handleExportDB = () => {
    const db = exportFullDatabase();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `EatAndDrink_Backup_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDbStatus('Database backup exported successfully');
    setTimeout(() => setDbStatus(''), 3000);
  };

  const handleImportDB = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        const res = importFullDatabase(json);
        if (res.success) {
          setDbStatus('Database imported successfully! Refreshing...');
          setTimeout(() => window.location.reload(), 1200);
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Could not read backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto w-full select-none pb-12 animate-pop-in">
      
      {/* ---------------------------------------------------- */}
      {/* 1. BLUETOOTH THERMAL PRINTER CARD                    */}
      {/* ---------------------------------------------------- */}
      <div className="glass-surface p-5 sm:p-6 rounded-[36px] shadow-sm border border-white/95 flex flex-col gap-4">
        
        {/* Header with Live Status Dot */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D8E1EC]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#18202B] text-white flex items-center justify-center shadow-md">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#18202B]">Bluetooth Thermal Printer</h2>
              <p className="text-xs text-[#697586] font-medium">
                One-time device pairing � Automatic background reconnect
              </p>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-2">
            {printerStatus === 'connected' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>CONNECTED (Ready)</span>
              </span>
            )}
            {printerStatus === 'reconnecting' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-300 shadow-xs">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Reconnecting...</span>
              </span>
            )}
            {printerStatus === 'offline' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-300 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Printer Offline</span>
              </span>
            )}
            {printerStatus === 'unconfigured' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#D8E1EC]/50 text-[#697586] border border-[#D8E1EC]">
                <span>Not Configured</span>
              </span>
            )}
          </div>
        </div>

        {/* Error / Warning Alert */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between animate-pop-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="text-rose-600 hover:text-rose-900 font-black">
              &times;
            </button>
          </div>
        )}

        {/* Success Alert */}
        {testPrintSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-pop-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Test slip sent directly to thermal printer successfully!</span>
          </div>
        )}

        {/* Active Device Info & Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          
          {/* Left: Device Specs Box */}
          <div className="p-4 rounded-3xl bg-white/70 border border-white/90 flex flex-col justify-between space-y-2.5 shadow-xs">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#697586]">Configured Hardware</span>
              <h3 className="text-sm font-black text-[#18202B] mt-0.5">
                {printerConfig?.name || 'No Bluetooth printer paired on this device'}
              </h3>
              <p className="text-xs text-[#697586] mt-0.5">
                {printerConfig ? `Protocol: Direct ESC/POS � Device ID: ${printerConfig.id.substring(0, 12)}...` : 'Pair your 58mm or 80mm printer once.'}
              </p>
            </div>

            {/* Paper Width Pills */}
            <div className="pt-2 border-t border-[#D8E1EC]/60 flex items-center justify-between">
              <span className="text-xs font-bold text-[#18202B]">Paper Roll Width:</span>
              <div className="flex items-center bg-[#F3F6FA] p-0.5 rounded-full border border-[#D8E1EC]">
                <button
                  type="button"
                  onClick={() => handlePaperWidthChange('58mm')}
                  className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
                    paperWidth === '58mm'
                      ? 'glass-pill-active font-black'
                      : 'text-[#697586] hover:text-[#18202B]'
                  }`}
                >
                  58mm (32 col)
                </button>
                <button
                  type="button"
                  onClick={() => handlePaperWidthChange('80mm')}
                  className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
                    paperWidth === '80mm'
                      ? 'glass-pill-active font-black'
                      : 'text-[#697586] hover:text-[#18202B]'
                  }`}
                >
                  80mm (48 col)
                </button>
              </div>
            </div>
          </div>

          {/* Right: Actions Box */}
          <div className="p-4 rounded-3xl bg-white/70 border border-white/90 flex flex-col justify-between space-y-2.5 shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#697586]">Hardware Actions</span>
            
            <div className="flex flex-col gap-2">
              {/* Primary Connect Button */}
              <button
                type="button"
                onClick={handleConnectPrinter}
                disabled={isPairing}
                className="w-full py-2.5 px-4 glass-btn-coral text-white rounded-full text-xs font-black flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer"
              >
                <Bluetooth className="w-4 h-4 stroke-[2.5]" />
                <span>{isPairing ? 'Discovering Printers...' : (printerConfig ? 'Change / Re-Pair Printer' : 'Connect Bluetooth Printer')}</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Test Print Button */}
                <button
                  type="button"
                  onClick={handleTestPrint}
                  disabled={testPrintLoading}
                  className="flex-1 py-2 px-3 glass-pill text-[#18202B] rounded-full text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <FileText className="w-3.5 h-3.5 text-[#FF5B4A]" />
                  <span>{testPrintLoading ? 'Printing...' : 'Test Print'}</span>
                </button>

                {/* Reconnect / Forget Buttons */}
                {printerConfig && (
                  <>
                    <button
                      type="button"
                      onClick={handleReconnect}
                      disabled={isReconnecting}
                      className="py-2 px-3 glass-pill text-[#697586] hover:text-[#18202B] rounded-full text-xs font-bold flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95"
                      title="Attempt reconnect"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
                      <span>Reconnect</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleForget}
                      className="p-2 glass-pill text-rose-600 hover:bg-rose-50 rounded-full cursor-pointer shadow-xs active:scale-95"
                      title="Forget this printer on this device"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. DATABASE BACKUP & RESTORE                         */}
      {/* ---------------------------------------------------- */}
      <div className="glass-surface p-5 sm:p-6 rounded-[36px] shadow-sm border border-white/95 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-[#18202B]">Database Backup &amp; Offline Snapshots</h3>
            <p className="text-xs text-[#697586] font-medium">Export entire bill history, daily earnings, and menu snapshot as JSON</p>
          </div>
          {dbStatus && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
              {dbStatus}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportDB}
            className="px-4 py-2 glass-pill text-[#18202B] rounded-full text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-[#FF5B4A]" />
            <span>Export Database JSON</span>
          </button>

          <label className="px-4 py-2 glass-pill text-[#18202B] rounded-full text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs">
            <Upload className="w-4 h-4 text-[#697586]" />
            <span>Import Database JSON</span>
            <input type="file" accept=".json" onChange={handleImportDB} className="hidden" />
          </label>
        </div>
      </div>

    </div>
  );
}
