import React, { useState } from 'react';
import { 
  Printer, 
  Check, 
  FileText, 
  Download, 
  Upload, 
  Volume2, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AVAILABLE_PRINTERS, printReceipt, generateReceiptText } from '../services/printer';
import { savePrinterSettings, exportFullDatabase, importFullDatabase } from '../services/storage';

export default function PrinterSettings({ 
  settings, 
  setSettings, 
  soundEnabled, 
  setSoundEnabled 
}) {
  const [selectedPrinter, setSelectedPrinter] = useState(settings?.selectedPrinter || 'Default System Printer');
  const [paperWidth, setPaperWidth] = useState(settings?.paperWidth || '80mm');
  const [shopName, setShopName] = useState(settings?.shopName || 'EAT & DRINK');
  const [shopLocation, setShopLocation] = useState(settings?.shopLocation || 'MANGALAGIRI');
  const [footerMessage, setFooterMessage] = useState(settings?.footerMessage || 'THANK YOU! VISIT AGAIN');
  const [autoPrint, setAutoPrint] = useState(settings?.autoPrint || false);

  const [testPrintSuccess, setTestPrintSuccess] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [dbStatus, setDbStatus] = useState('');

  const sampleBill = {
    billNumber: '#TEST01',
    date: '30-08-2026',
    time: '12:00 PM',
    customerName: 'Test Customer',
    items: [
      { itemName: 'Mighty Zinger', quantity: 1, unitPrice: 130 },
      { itemName: 'Mango Lassi', quantity: 1, unitPrice: 60 }
    ],
    subtotal: 190,
    discount: 0,
    total: 190,
    paymentMethod: 'CASH'
  };

  const handleSave = (e) => {
    e.preventDefault();
    const newSettings = {
      selectedPrinter,
      paperWidth,
      shopName: shopName.trim() || 'EAT & DRINK',
      shopLocation: shopLocation.trim() || 'MANGALAGIRI',
      footerMessage: footerMessage.trim() || 'THANK YOU! VISIT AGAIN',
      autoPrint,
      soundEnabled
    };
    setSettings(newSettings);
    savePrinterSettings(newSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestPrint = async () => {
    const currentConfig = {
      selectedPrinter,
      paperWidth,
      shopName,
      shopLocation,
      footerMessage
    };
    try {
      await printReceipt(sampleBill, currentConfig);
      setTestPrintSuccess(true);
      setTimeout(() => setTestPrintSuccess(false), 3000);
    } catch (e) {
      alert('Error triggering print. Please verify printer connectivity.');
    }
  };

  const handleExportDB = () => {
    const db = exportFullDatabase();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `EatAndDrink_Backup_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDbStatus('Backup downloaded successfully');
    setTimeout(() => setDbStatus(''), 3000);
  };

  const handleImportDB = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        importFullDatabase(json);
        alert('Database restored successfully! Reloading...');
        window.location.reload();
      } catch (err) {
        alert('Invalid backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const previewText = generateReceiptText(sampleBill, {
    paperWidth,
    shopName,
    shopLocation,
    footerMessage
  });

  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-4 max-w-6xl mx-auto w-full select-none">
      {/* Top Banner */}
      <div className="glass-surface p-4.5 rounded-[32px] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FF5B4A] text-white flex items-center justify-center shadow-md shadow-[#FF5B4A]/25">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#18202B]">Printer & System Settings</h1>
            <p className="text-xs text-[#697586] font-medium">
              Configure thermal receipt printer profiles, paper sizes (58mm/80mm), and templates
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold animate-pop-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Form: Settings (7 cols) */}
        <div className="lg:col-span-7 glass-surface p-5 rounded-[32px] space-y-4 shadow-sm">
          <form onSubmit={handleSave} className="space-y-4">
            {/* Connected Printer Selection */}
            <div>
              <label className="block text-xs font-bold text-[#697586] uppercase tracking-wider mb-1.5">
                Connected Thermal Printer
              </label>
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="w-full bg-white/70 border border-white/90 rounded-2xl p-2.5 text-xs text-[#18202B] font-bold focus:outline-none focus:border-[#FF5B4A] shadow-xs"
              >
                {AVAILABLE_PRINTERS.map(p => (
                  <option key={p.id} value={p.name}>
                    {p.name} ({p.status})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[#98A2B3] mt-1 font-medium">
                Supports EPSON TM-T82, XPrinter, POS-80, POS-58 and standard Windows thermal drivers
              </p>
            </div>

            {/* Paper Width Selection */}
            <div>
              <label className="block text-xs font-bold text-[#697586] uppercase tracking-wider mb-1.5">
                Receipt Paper Width
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaperWidth('58mm')}
                  className={`p-3.5 rounded-[22px] text-left font-bold transition-all cursor-pointer ${
                    paperWidth === '58mm'
                      ? 'glass-pill-active'
                      : 'glass-pill text-[#18202B]'
                  }`}
                >
                  <div className="text-xs font-black">58mm Thermal (Mini)</div>
                  <div className="text-[10px] font-normal opacity-80 mt-0.5">Compact receipt format (32 columns)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaperWidth('80mm')}
                  className={`p-3.5 rounded-[22px] text-left font-bold transition-all cursor-pointer ${
                    paperWidth === '80mm'
                      ? 'glass-pill-active'
                      : 'glass-pill text-[#18202B]'
                  }`}
                >
                  <div className="text-xs font-black">80mm Thermal (Standard POS)</div>
                  <div className="text-[10px] font-normal opacity-80 mt-0.5">Full restaurant receipt (44 columns)</div>
                </button>
              </div>
            </div>

            {/* Shop Brand Header & Location */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#697586] uppercase tracking-wider mb-1">
                  Brand Header
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full bg-white/70 border border-white/90 rounded-2xl p-2.5 text-xs text-[#18202B] font-bold focus:outline-none focus:border-[#FF5B4A] shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#697586] uppercase tracking-wider mb-1">
                  Location Subtitle
                </label>
                <input
                  type="text"
                  value={shopLocation}
                  onChange={(e) => setShopLocation(e.target.value)}
                  className="w-full bg-white/70 border border-white/90 rounded-2xl p-2.5 text-xs text-[#18202B] font-bold focus:outline-none focus:border-[#FF5B4A] shadow-xs"
                />
              </div>
            </div>

            {/* Receipt Footer Message */}
            <div>
              <label className="block text-xs font-bold text-[#697586] uppercase tracking-wider mb-1">
                Receipt Footer Greeting
              </label>
              <input
                type="text"
                value={footerMessage}
                onChange={(e) => setFooterMessage(e.target.value)}
                className="w-full bg-white/70 border border-white/90 rounded-2xl p-2.5 text-xs text-[#18202B] font-medium focus:outline-none focus:border-[#FF5B4A] shadow-xs"
              />
            </div>

            {/* Sound Toggle */}
            <div className="flex items-center justify-between p-3.5 glass-inset rounded-2xl">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-[#FF5B4A]" />
                <div>
                  <div className="text-xs font-bold text-[#18202B]">Cashier Sound Feedback</div>
                  <div className="text-[10px] text-[#697586]">Audio chimes on item add and bill confirmation</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-4 h-4 text-[#FF5B4A] rounded focus:ring-[#FF5B4A] accent-[#FF5B4A] cursor-pointer"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-[#D8E1EC]/60">
              <button
                type="button"
                onClick={handleTestPrint}
                className="px-4 py-2 glass-pill text-[#18202B] rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-[#FF5B4A]" />
                <span>Test Print Receipt</span>
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 glass-btn-coral text-white font-black rounded-full text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save Settings</span>
              </button>
            </div>
          </form>

          {/* Database Backup & Restore */}
          <div className="pt-4 border-t border-[#D8E1EC]/60">
            <h3 className="text-xs font-black tracking-wider uppercase text-[#697586] mb-2">
              Database Backup & Cloud Sync
            </h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportDB}
                className="px-4 py-2 glass-pill text-[#18202B] rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-[#FF5B4A]" />
                <span>Backup Data (JSON)</span>
              </button>

              <label className="px-4 py-2 glass-pill text-[#18202B] rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs">
                <Upload className="w-3.5 h-3.5 text-sky-600" />
                <span>Restore Database</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportDB}
                  className="hidden"
                />
              </label>
            </div>
            {dbStatus && <p className="text-[10px] text-emerald-600 mt-1.5 font-bold">{dbStatus}</p>}
          </div>
        </div>

        {/* Right Form: Monospace Thermal Layout Preview (5 cols) */}
        <div className="lg:col-span-5 glass-surface p-4 rounded-[32px] flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#D8E1EC]/60">
            <h3 className="text-xs font-black tracking-wider uppercase text-[#697586] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#FF5B4A]" />
              <span>Thermal Receipt Output Preview</span>
            </h3>
            <span className="text-[10px] font-bold text-[#FF5B4A] font-mono">{paperWidth}</span>
          </div>

          <div className="flex-1 bg-white rounded-2xl p-3.5 overflow-x-auto border border-[#D8E1EC] shadow-inner">
            <pre className="receipt-font text-[11px] text-stone-900 leading-tight">
              {previewText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
