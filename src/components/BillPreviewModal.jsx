import React, { useState } from 'react';
import { 
  Printer, 
  Check, 
  X, 
  Copy, 
  CheckCheck, 
  Bluetooth,
  RefreshCw,
  AlertCircle,
  FileText
} from 'lucide-react';
import { printReceipt, generateReceiptText, bluetoothPrinter } from '../services/printer';
import { logger } from '../services/logger';

export default function BillPreviewModal({ 
  bill, 
  onClose, 
  printerSettings,
  onPrintSuccess
}) {
  const savedPrinter = bluetoothPrinter.getSavedConfig();
  const [paperWidth, setPaperWidth] = useState(savedPrinter?.paperWidth || printerSettings?.paperWidth || '80mm');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Status: 'idle', 'success', 'no_printer', 'offline', 'error'
  const [printStatus, setPrintStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  if (!bill) return null;

  const receiptConfig = {
    paperWidth,
    shopName: printerSettings?.shopName || 'EAT & DRINK',
    shopLocation: printerSettings?.shopLocation || 'MANGALAGIRI',
    footerMessage: printerSettings?.footerMessage || 'THANK YOU! VISIT AGAIN'
  };

  const receiptFormattedText = generateReceiptText(bill, receiptConfig);

  // 1. Direct Bluetooth Print Flow
  const handleBluetoothPrint = async () => {
    setIsPrinting(true);
    setPrintStatus('idle');
    setErrorMessage('');
    try {
      await printReceipt(bill, receiptConfig);
      setPrintStatus('success');
      if (onPrintSuccess) onPrintSuccess();
    } catch (err) {
      logger.warn('BillPreviewModal', 'Thermal print exception', err);
      if (err.code === 'NO_PRINTER_CONFIGURED') {
        setPrintStatus('no_printer');
      } else if (err.code === 'PRINTER_OFFLINE') {
        setPrintStatus('offline');
      } else {
        setPrintStatus('error');
        setErrorMessage(err.message || 'Thermal printer communication failed.');
      }
    } finally {
      setIsPrinting(false);
    }
  };

  // 2. Direct Browser / System Print Dialog Fallback (Zero Bluetooth Dependency)
  const handleBrowserSystemPrint = () => {
    try {
      window.print();
      setPrintStatus('success');
    } catch (err) {
      logger.warn('BillPreviewModal', 'Browser print failed', err);
    }
  };

  // 3. Direct Setup / Pair from Modal
  const handlePairPrinterFromModal = async () => {
    setIsPairing(true);
    setErrorMessage('');
    try {
      await bluetoothPrinter.pairNewPrinter(paperWidth);
      setPrintStatus('idle');
      // Immediately print after pairing
      await handleBluetoothPrint();
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        setErrorMessage(err.message || 'Bluetooth pairing failed.');
      }
    } finally {
      setIsPairing(false);
    }
  };

  // 4. Reconnect from Modal
  const handleReconnectFromModal = async () => {
    setIsReconnecting(true);
    setErrorMessage('');
    try {
      const char = await bluetoothPrinter.autoReconnect();
      if (char) {
        setPrintStatus('idle');
        await handleBluetoothPrint();
      } else {
        setErrorMessage('Printer is still offline. Please power on the device or click "Pair Printer".');
      }
    } catch (err) {
      logger.warn('BillPreviewModal', 'Reconnect failed', err);
      setErrorMessage('Could not reconnect to thermal printer.');
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(receiptFormattedText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-md animate-pop-in select-none">
      
      {/* Modal Dialog (Light Frosted Glass Card) */}
      <div className="glass-surface rounded-[28px] sm:rounded-[36px] max-w-lg w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-white/95">
        
        {/* Header with Title & Close */}
        <div className="flex items-center justify-between pb-3 border-b border-[#D8E1EC]/60 shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-[#18202B] leading-tight truncate">Bill Generated</h2>
              <p className="text-[11px] sm:text-xs font-mono font-bold text-[#FF5B4A]">
                {bill.billNumber || '#000000'} • {bill.paymentMethod || 'CASH'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Paper Width Selector Pills */}
            <div className="flex items-center bg-[#F3F6FA] rounded-full p-0.5 sm:p-1 border border-[#D8E1EC]">
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-black transition-all cursor-pointer ${
                  paperWidth === '58mm'
                    ? 'glass-pill-active'
                    : 'text-[#697586] hover:text-[#18202B]'
                }`}
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-black transition-all cursor-pointer ${
                  paperWidth === '80mm'
                    ? 'glass-pill-active'
                    : 'text-[#697586] hover:text-[#18202B]'
                }`}
              >
                80mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full glass-pill text-[#697586] hover:text-[#18202B] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Preview Area (Crisp White Thermal Paper Simulation) */}
        <div className="my-2.5 sm:my-3.5 flex-1 overflow-y-auto overflow-x-auto p-3 sm:p-4 bg-white rounded-2xl border border-[#D8E1EC] shadow-inner flex flex-col items-center">
          <div 
            style={{ 
              maxWidth: paperWidth === '58mm' ? '250px' : '330px',
              width: '100%'
            }}
            className="flex flex-col items-center"
          >
            <img 
              src="/eat-and-drink.png" 
              alt="EAT & DRINK" 
              className="h-10 sm:h-12 w-auto mb-1.5 object-contain" 
            />
            <pre 
              id="printable-receipt"
              className="receipt-font text-[9.5px] xs:text-[10.5px] sm:text-[11.5px] leading-tight text-black whitespace-pre tracking-normal w-full"
              style={{ fontFamily: '"Courier New", Courier, monospace' }}
            >
              {receiptFormattedText}
            </pre>
          </div>
        </div>

        {/* PRINT STATUS FEEDBACK BANNERS */}
        {printStatus === 'success' && (
          <div className="mb-2 p-2.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-between animate-pop-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
              <span>Receipt printed successfully.</span>
            </div>
            <button onClick={() => setPrintStatus('idle')} className="text-emerald-700 hover:text-emerald-900 p-0.5 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* First Time Setup: No Printer Configured on This Device */}
        {printStatus === 'no_printer' && (
          <div className="mb-2 p-2.5 sm:p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex flex-col gap-2 animate-pop-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>No thermal printer connected. (Bill is safely saved)</span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 pt-1.5 border-t border-amber-200">
              <button 
                onClick={handleBrowserSystemPrint}
                className="flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 glass-pill text-[#18202B] rounded-full text-[11px] sm:text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>System Print</span>
              </button>
              <button 
                onClick={handlePairPrinterFromModal}
                disabled={isPairing}
                className="flex-1 sm:flex-none px-3.5 sm:px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-[11px] sm:text-xs font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Bluetooth className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                <span>{isPairing ? 'Connecting...' : 'CONNECT PRINTER'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Printer Offline Banner */}
        {printStatus === 'offline' && (
          <div className="mb-2 p-2.5 sm:p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex flex-col gap-2 animate-pop-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Thermal printer is offline. (Bill is safely saved)</span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 pt-1.5 border-t border-rose-200">
              <button 
                onClick={handleBrowserSystemPrint}
                className="flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 glass-pill text-[#18202B] rounded-full text-[11px] sm:text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>System Print</span>
              </button>
              <button 
                onClick={handlePairPrinterFromModal}
                disabled={isPairing}
                className="flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 glass-pill text-rose-800 rounded-full text-[11px] sm:text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
              >
                <Bluetooth className="w-3.5 h-3.5 shrink-0" />
                <span>Pair Printer</span>
              </button>
              <button 
                onClick={handleReconnectFromModal}
                disabled={isReconnecting}
                className="w-full sm:w-auto px-3.5 sm:px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-[11px] sm:text-xs font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isReconnecting ? 'animate-spin' : ''}`} />
                <span>{isReconnecting ? 'Reconnecting...' : 'RECONNECT & PRINT'}</span>
              </button>
            </div>
          </div>
        )}

        {/* General Error Banner */}
        {printStatus === 'error' && (
          <div className="mb-2 p-2.5 sm:p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex flex-col gap-2 animate-pop-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage || 'Printing failed. (Bill is safely saved)'}</span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 pt-1.5 border-t border-rose-200">
              <button 
                onClick={handleBrowserSystemPrint}
                className="flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 glass-pill text-[#18202B] rounded-full text-[11px] sm:text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>System Print</span>
              </button>
              <button 
                onClick={handleBluetoothPrint}
                className="flex-1 sm:flex-none px-3.5 sm:px-4 py-1.5 bg-rose-600 text-white rounded-full text-[11px] sm:text-xs font-black cursor-pointer hover:bg-rose-700 flex items-center justify-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                <span>RETRY PRINT</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="pt-2.5 border-t border-[#D8E1EC]/60 flex items-center justify-between gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 sm:px-4 py-2 sm:py-2.5 glass-pill rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1.5 cursor-pointer text-[#18202B] shrink-0"
          >
            {copied ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#697586]" />
                <span className="hidden xs:inline">Copy Receipt</span>
                <span className="xs:hidden">Copy</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-2 sm:py-2.5 glass-pill text-[#697586] hover:text-[#18202B] rounded-full text-[11px] sm:text-xs font-bold cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleBluetoothPrint}
              disabled={isPrinting}
              className="px-4 sm:px-6 py-2 sm:py-2.5 glass-btn-coral rounded-full text-[11px] sm:text-xs font-black flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-lg active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              <span>{isPrinting ? 'Printing...' : 'PRINT RECEIPT'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
