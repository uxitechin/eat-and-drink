import React from 'react';
import { Download, X } from 'lucide-react';

export function InstallGuideModal({ onClose }) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-pop-in select-none">
      <div className="glass-surface rounded-[36px] max-w-md w-full p-6 shadow-2xl flex flex-col border border-white/95 text-[#18202B]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#D8E1EC]/60">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-2xl border border-[#D8E1EC] shadow-sm shrink-0">
              <img src="/eat-and-drink.png" alt="EAT & DRINK" className="h-9 w-auto object-contain" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#18202B]">Install EAT &amp; DRINK</h3>
              <p className="text-xs text-[#697586] font-medium">Quick 2-step home screen installation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-[#697586] hover:text-[#18202B]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform-Specific Step Guide */}
        <div className="py-4 space-y-3">
          {isIOS ? (
            <>
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 border border-white/90">
                <div className="w-7 h-7 rounded-full bg-[#FF5B4A]/10 text-[#FF5B4A] font-black flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div className="text-xs">
                  <p className="font-bold text-[#18202B]">Tap the Share icon in Safari</p>
                  <p className="text-[#697586] mt-0.5">Look for the share icon at the bottom of Safari.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 border border-white/90">
                <div className="w-7 h-7 rounded-full bg-[#FF5B4A]/10 text-[#FF5B4A] font-black flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div className="text-xs">
                  <p className="font-bold text-[#18202B]">Scroll down and tap "Add to Home Screen"</p>
                  <p className="text-[#697586] mt-0.5">The official EAT &amp; DRINK app icon will be pinned to your home screen.</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 border border-white/90">
                <div className="w-7 h-7 rounded-full bg-[#FF5B4A]/10 text-[#FF5B4A] font-black flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div className="text-xs">
                  <p className="font-bold text-[#18202B]">Tap Browser Menu (3 dots ⋮ at top right)</p>
                  <p className="text-[#697586] mt-0.5">Open the browser settings menu in Chrome / Edge.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 border border-white/90">
                <div className="w-7 h-7 rounded-full bg-[#FF5B4A]/10 text-[#FF5B4A] font-black flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div className="text-xs">
                  <p className="font-bold text-[#18202B]">Tap "Install App" or "Add to Home screen"</p>
                  <p className="text-[#697586] mt-0.5">The app with the official restaurant icon will be added to your app drawer.</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[#D8E1EC]/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 glass-btn-coral text-white rounded-full text-xs font-black cursor-pointer shadow-md"
          >
            Got it, thanks!
          </button>
        </div>

      </div>
    </div>
  );
}

export default function InstallPromptModal({ onInstall, onDismiss }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-pop-in select-none">
      <div className="glass-surface p-6 rounded-[36px] shadow-2xl border border-white/95 flex flex-col gap-4 max-w-sm w-full backdrop-blur-2xl">
        
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2.5 rounded-2xl flex items-center justify-center border border-[#D8E1EC] shadow-sm shrink-0">
              <img 
                src="/eat-and-drink.png" 
                alt="EAT & DRINK" 
                className="h-11 w-auto object-contain" 
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-[#18202B]">EAT &amp; DRINK</h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FF5B4A]/15 text-[#FF5B4A]">APP</span>
              </div>
              <p className="text-xs text-[#697586] font-medium leading-tight mt-1">
                Install as a full application on your home screen &amp; app drawer.
              </p>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="text-[#98A2B3] hover:text-[#18202B] p-1.5 rounded-full cursor-pointer shrink-0 transition-colors"
            title="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#D8E1EC]/60">
          <button
            onClick={onDismiss}
            className="px-5 py-2.5 glass-pill text-[#697586] hover:text-[#18202B] rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            Maybe Later
          </button>

          <button
            onClick={onInstall}
            className="px-6 py-2.5 glass-btn-coral text-white rounded-full text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>INSTALL APP</span>
          </button>
        </div>

      </div>
    </div>
  );
}

