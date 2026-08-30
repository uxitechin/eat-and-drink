import React from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPromptModal({ onInstall, onDismiss }) {
  return (
    <div className="fixed bottom-24 sm:bottom-20 right-4 sm:right-6 z-50 animate-pop-in max-w-sm w-[calc(100vw-32px)]">
      <div className="glass-surface p-4.5 rounded-[32px] shadow-2xl border border-white/95 flex flex-col gap-3">
        
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-[#0f131a] px-2.5 py-1.5 rounded-2xl flex items-center justify-center border border-white/20 shadow-md shrink-0">
              <img 
                src="/logo.png" 
                alt="EAT & DRINK" 
                className="h-7 w-auto object-contain" 
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-[#18202B]">EAT &amp; DRINK</h3>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#FF5B4A]/15 text-[#FF5B4A]">MANGALAGIRI</span>
              </div>
              <p className="text-[11px] text-[#697586] font-medium leading-tight mt-0.5">
                Install EAT &amp; DRINK on this device for a faster app-like experience.
              </p>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="text-[#98A2B3] hover:text-[#18202B] p-1 rounded-full cursor-pointer shrink-0 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onDismiss}
            className="px-4 py-2 glass-pill text-[#697586] hover:text-[#18202B] rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            Not Now
          </button>

          <button
            onClick={onInstall}
            className="px-5 py-2 glass-btn-coral text-white rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>INSTALL</span>
          </button>
        </div>

      </div>
    </div>
  );
}
