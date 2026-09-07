import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Check, 
  X, 
  Copy, 
  CheckCheck, 
  Bluetooth
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
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [inlineNotice, setInlineNotice] = useState('');
  
  // Track if printer is actively paired/configured on this device
  const [isPrinterConnected, setIsPrinterConnected] = useState(() => {
    return Boolean(
      (bluetoothPrinter.server && bluetoothPrinter.server.connected && bluetoothPrinter.characteristic) ||
      bluetoothPrinter.getSavedConfig()
    );
  });

  // Keep state synchronized with bluetooth manager
  useEffect(() => {
    const unsub = bluetoothPrinter.onStatusChange((status) => {
      if (status === 'connected') {
        setIsPrinterConnected(true);
      } else if (status === 'unconfigured') {
        setIsPrinterConnected(false);
      }
    });
    return unsub;
  }, []);

  if (!bill) return null;

  const receiptConfig = {
    paperWidth,
    shopName: printerSettings?.shopName || 'EAT & DRINK',
    shopLocation: printerSettings?.shopLocation || 'MANGALAGIRI',
    footerMessage: printerSettings?.footerMessage || 'THANK YOU! VISIT AGAIN'
  };

  const receiptFormattedText = generateReceiptText(bill, receiptConfig);

  // 1. Pair / Connect Bluetooth Thermal Printer
  const handlePairPrinter = async () => {
    setInlineNotice('');
    try {
      const config = await bluetoothPrinter.pairNewPrinter(paperWidth);
      if (config && bluetoothPrinter.characteristic) {
        setIsPrinterConnected(true);
        // Once paired, immediately print the receipt
        await printReceipt(bill, { ...receiptConfig, paperWidth });
        if (onPrintSuccess) onPrintSuccess();
      }
    } catch (err) {
      logger.warn('BillPreviewModal', 'Pair printer error', err);
      if (err.name !== 'NotFoundError' && err.name !== 'AbortError') {
        setInlineNotice('Printer unavailable. Bill is already saved.');
      }
    }
  };

  // 2. Direct Thermal Print via ESC/POS
  const handleDirectPrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    setInlineNotice('');
    try {
      await printReceipt(bill, { ...receiptConfig, paperWidth });
      if (onPrintSuccess) onPrintSuccess();
    } catch (err) {
      logger.warn('BillPreviewModal', 'Direct thermal print error', err);
      setIsPrinterConnected(false);
      setInlineNotice('Printer unavailable. Bill is already saved.');
    } finally {
      setIsPrinting(false);
    }
  };

  // 3. Browser / System Print Dialog (Zero Bluetooth dependency)
  const handleSystemPrint = () => {
    try {
      window.print();
    } catch (err) {
      logger.warn('BillPreviewModal', 'System print error', err);
    }
  };

  // Copy receipt text to clipboard
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

        {/* Clean Inline Failure Notice (Non-intrusive) */}
        {inlineNotice && (
          <p className="text-[11px] font-bold text-rose-700 text-center pb-1.5 animate-pop-in">
            {inlineNotice}
          </p>
        )}

        {/* Action Buttons: Clean 2x2 Layout */}
        <div className="pt-2 border-t border-[#D8E1EC]/60 flex flex-col gap-2 shrink-0">
          {/* Row 1: Printer Actions */}
          <div className="grid grid-cols-2 gap-2">
            {isPrinterConnected ? (
              <button
                type="button"
                onClick={handleDirectPrint}
                disabled={isPrinting}
                className="w-full py-2.5 px-3 glass-btn-coral rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.98] transition-all"
              >
                <Printer className="w-4 h-4 stroke-[2.5] shrink-0" />
                <span>{isPrinting ? 'Printing...' : 'PRINT RECEIPT'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePairPrinter}
                className="w-full py-2.5 px-3 glass-pill text-[#18202B] hover:text-black rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <Bluetooth className="w-4 h-4 text-[#FF5B4A] stroke-[2.5] shrink-0" />
                <span>Pair Printer</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSystemPrint}
              className="w-full py-2.5 px-3 glass-pill text-[#18202B] hover:text-black rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Printer className="w-4 h-4 text-[#4361EE] stroke-[2.5] shrink-0" />
              <span>System Print</span>
            </button>
          </div>

          {/* Row 2: Copy & Close */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="w-full py-2.5 px-3 glass-pill text-[#18202B] rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              {copied ? (
                <>
                  <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-600 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#697586] shrink-0" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-3 bg-[#18202B] hover:bg-black text-white rounded-2xl text-xs font-bold flex items-center justify-center cursor-pointer transition-all active:scale-[0.98]"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
