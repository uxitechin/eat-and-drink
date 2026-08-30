import React, { useState } from 'react';
import { 
  Printer, 
  Check, 
  X, 
  Copy, 
  CheckCheck, 
  Bluetooth,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { printReceipt, generateReceiptText, bluetoothPrinter } from '../services/printer';

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

  // 1. Direct Print Flow
  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintStatus('idle');
    setErrorMessage('');
    try {
      await printReceipt(bill, receiptConfig);
      setPrintStatus('success');
      if (onPrintSuccess) onPrintSuccess();
    } catch (err) {
      console.warn('Thermal print exception:', err);
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

  // 2. Direct Setup from Modal if first time on this device
  const handlePairPrinterFromModal = async () => {
    setIsPairing(true);
    try {
      await bluetoothPrinter.pairNewPrinter(paperWidth);
      setPrintStatus('idle');
      // Immediately print after pairing
      await handlePrint();
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        setErrorMessage(err.message || 'Pairing failed.');
      }
    } finally {
      setIsPairing(false);
    }
  };

  // 3. Reconnect from Modal
  const handleReconnectFromModal = async () => {
    setIsReconnecting(true);
    try {
      const char = await bluetoothPrinter.autoReconnect();
      if (char) {
        setPrintStatus('idle');
        await handlePrint();
      } else {
        setErrorMessage('Printer is still offline. Please power on the device.');
      }
    } catch (err) {
      setErrorMessage('Could not reconnect to thermal printer.');
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(receiptFormattedText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-pop-in select-none">
      
      {/* Modal Dialog (Light Frosted Glass Card) */}
      <div className="glass-surface rounded-[36px] max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/95">
        
        {/* Header with Title & Close */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#D8E1EC]/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#18202B] leading-tight">Bill Generated</h2>
              <p className="text-xs font-mono font-bold text-[#FF5B4A]">
                {bill.billNumber} � {bill.paymentMethod}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper Width Selector Pills */}
            <div className="flex items-center bg-[#F3F6FA] rounded-full p-1 border border-[#D8E1EC]">
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer ${
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
                className={`px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer ${
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
              className="p-2 rounded-full glass-pill text-[#697586] hover:text-[#18202B] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Preview Area (Crisp White Thermal Paper Simulation) */}
        <div className="my-3.5 flex-1 overflow-y-auto p-4 bg-white rounded-2xl border border-[#D8E1EC] shadow-inner flex flex-col items-center">
          <div 
            style={{ 
              maxWidth: paperWidth === '58mm' ? '250px' : '340px',
              width: '100%'
            }}
            className="flex flex-col items-center"
          >
            <img 
              src="/eat-and-drink.png" 
              alt="EAT & DRINK" 
              className="h-12 w-auto mb-1.5 object-contain"
            />
            <pre 
              id="printable-receipt"
              className="receipt-font text-[11px] sm:text-[11.5px] leading-tight text-black whitespace-pre tracking-normal w-full"
              style={{ fontFamily: '"Courier New", Courier, monospace' }}
            >
              {receiptFormattedText}
            </pre>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* PRINT STATUS FEEDBACK BANNERS                        */}
        {/* ---------------------------------------------------- */}
        {printStatus === 'success' && (
          <div className="mb-2 p-2.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-between animate-pop-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
              <span>Receipt printed successfully.</span>
            </div>
            <button onClick={() => setPrintStatus('idle')} className="text-emerald-700 hover:text-emerald-900 p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* First Time Setup: No Printer Configured on This Device */}
        {printStatus === 'no_printer' && (
          <div className="mb-2 p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex flex-col gap-2 animate-pop-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>No thermal printer connected on this device yet.</span>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200">
              <button 
                onClick={() => setPrintStatus('idle')}
                className="px-3 py-1.5 glass-pill text-amber-800 rounded-full text-xs font-bold cursor-pointer"
              >
                PRINT LATER
              </button>
              <button 
                onClick={handlePairPrinterFromModal}
                disabled={isPairing}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Bluetooth className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isPairing ? 'Connecting...' : 'CONNECT PRINTER'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Printer Offline Banner */}
        {printStatus === 'offline' && (
          <div className="mb-2 p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex flex-col gap-2 animate-pop-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Thermal printer is offline. (Bill is safely saved)</span>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-200">
              <button 
                onClick={() => setPrintStatus('idle')}
                className="px-3 py-1.5 glass-pill text-rose-800 rounded-full text-xs font-bold cursor-pointer"
              >
                PRINT LATER
              </button>
              <button 
                onClick={handleReconnectFromModal}
                disabled={isReconnecting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
                <span>{isReconnecting ? 'Reconnecting...' : 'RECONNECT & PRINT'}</span>
              </button>
            </div>
          </div>
        )}

        {/* General Error Banner */}
        {printStatus === 'error' && (
          <div className="mb-2 p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center justify-between animate-pop-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage || 'Printing failed. Please check thermal printer.'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handlePrint}
                className="px-3 py-1 bg-rose-600 text-white rounded-full text-[11px] font-black cursor-pointer hover:bg-rose-700"
              >
                RETRY
              </button>
              <button 
                onClick={() => setPrintStatus('idle')}
                className="px-2.5 py-1 glass-pill text-rose-700 rounded-full text-[11px] font-bold cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="pt-2 border-t border-[#D8E1EC]/60 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2.5 glass-pill rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer text-[#18202B]"
          >
            {copied ? (
              <>
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-600 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#697586]" />
                <span>Copy Receipt</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 glass-pill text-[#697586] hover:text-[#18202B] rounded-full text-xs font-bold cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-6 py-2.5 glass-btn-coral rounded-full text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>{isPrinting ? 'Sending to Printer...' : 'PRINT RECEIPT'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
