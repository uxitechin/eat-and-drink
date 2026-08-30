import React, { useState } from 'react';
import { 
  Printer, 
  Check, 
  X, 
  Copy, 
  CheckCheck, 
  FileText
} from 'lucide-react';
import { printReceipt, generateReceiptText } from '../services/printer';

export default function BillPreviewModal({ 
  bill, 
  onClose, 
  printerSettings,
  onPrintSuccess
}) {
  const [paperWidth, setPaperWidth] = useState(printerSettings?.paperWidth || '80mm');
  const [isPrinting, setIsPrinting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!bill) return null;

  const receiptConfig = {
    paperWidth,
    shopName: printerSettings?.shopName || 'EAT & DRINK',
    shopLocation: printerSettings?.shopLocation || 'MANGALAGIRI',
    footerMessage: printerSettings?.footerMessage || 'THANK YOU! VISIT AGAIN'
  };

  const receiptFormattedText = generateReceiptText(bill, receiptConfig);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printReceipt(bill, receiptConfig);
      if (onPrintSuccess) onPrintSuccess();
    } catch (e) {
      console.error(e);
      alert('Could not trigger thermal printer. Please check printer connection.');
    } finally {
      setIsPrinting(false);
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
                {bill.billNumber} • {bill.paymentMethod}
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

        {/* Receipt Preview Area (Crisp White Thermal Paper Style) */}
        <div className="my-3.5 flex-1 overflow-y-auto p-4 bg-white rounded-2xl border border-[#D8E1EC] shadow-inner flex flex-col items-center">
          <pre 
            id="printable-receipt"
            className="receipt-font text-[11.5px] leading-tight text-black whitespace-pre tracking-normal w-full"
            style={{ 
              maxWidth: paperWidth === '58mm' ? '290px' : '380px',
              fontFamily: '"Courier New", Courier, monospace'
            }}
          >
            {receiptFormattedText}
          </pre>
        </div>

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
              className="px-6 py-2.5 glass-btn-coral rounded-full text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>{isPrinting ? 'Printing...' : 'Print Thermal Receipt'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
