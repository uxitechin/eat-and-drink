import React, { useEffect, useState } from 'react';

export default function StartupAnimation({ onFinish }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // 0.0 - 0.7s: Soft blurred frosted glass surface appears
    const t1 = setTimeout(() => setPhase(1), 200);
    // 0.7 - 1.2s: "EAT" appears smoothly
    const t2 = setTimeout(() => setPhase(2), 700);
    // 1.2 - 1.7s: "&" appears
    const t3 = setTimeout(() => setPhase(3), 1200);
    // 1.7 - 2.3s: "DRINK" appears
    const t4 = setTimeout(() => setPhase(4), 1700);
    // 2.3 - 2.7s: Full logo settles + MANGALAGIRI badge
    const t5 = setTimeout(() => setPhase(5), 2300);
    // 2.7 - 3.0s: Soft coral depth glow
    const t6 = setTimeout(() => setPhase(6), 2700);
    // 3.0s: Transition seamlessly to POS
    const t7 = setTimeout(() => {
      if (onFinish) onFinish();
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      clearTimeout(t7);
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F3F6FA] text-[#18202B] select-none overflow-hidden">
      {/* Dynamic Ambient Frosted Glass Liquid Light Spheres */}
      <div 
        className={`absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#D8E1EC]/70 blur-3xl transition-all duration-1000 ${
          phase >= 2 ? 'opacity-80 scale-110 translate-x-12 translate-y-12' : 'opacity-30 scale-90'
        }`}
      />
      <div 
        className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#FF5B4A]/12 blur-3xl transition-all duration-1000 ${
          phase >= 4 ? 'opacity-80 scale-110 -translate-x-12 -translate-y-12' : 'opacity-20 scale-90'
        }`}
      />
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/60 blur-2xl transition-opacity duration-1000 ${
          phase >= 1 ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Main Frosted Glass Smartphone Card */}
      <div className="relative flex flex-col items-center justify-center max-w-md w-full p-6 text-center z-10">
        
        <div 
          className={`relative glass-surface rounded-[40px] p-8 sm:p-10 shadow-2xl flex flex-col items-center justify-center transition-all duration-700 transform ${
            phase >= 1 ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8'
          } ${phase >= 6 ? 'shadow-[0_25px_60px_-10px_rgba(255,91,74,0.22)] border-white/95' : ''}`}
        >
          {/* Subtle Top Accent Highlight */}
          <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-[#FF5B4A]/50 to-transparent rounded-full" />

          {/* Main Vibrant Official Logo on Crisp White Surface */}
          <div 
            className={`transition-all duration-700 transform ${
              phase >= 2 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'
            }`}
          >
            <div className="bg-white p-3.5 rounded-3xl border border-[#D8E1EC] shadow-md my-3 max-w-[200px] flex items-center justify-center">
              <img 
                src="/eat-and-drink.png" 
                alt="EAT & DRINK" 
                className="w-full h-auto object-contain"
              />
            </div>
          </div>

          {/* Logo settling & Chef Motif badge */}
          <div 
            className={`transition-all duration-700 transform ${
              phase >= 4 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-3'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-[#FF5B4A]/10 border border-[#FF5B4A]/25 text-[#FF5B4A] font-black text-xs tracking-[0.25em] uppercase shadow-sm">
              <span>MANGALAGIRI</span>
            </div>
          </div>

          {/* Minimalist Frosted Progress Pill */}
          <div className="w-40 h-1.5 bg-[#D8E1EC]/60 rounded-full mt-7 overflow-hidden p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-[#FF5B4A] to-[#FF7667] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, (phase / 6) * 100)}%` }}
            />
          </div>
        </div>

        {/* Status indicator */}
        <div className="mt-6 flex items-center gap-2 text-[#697586] text-xs font-semibold">
          <div className="w-2 h-2 rounded-full bg-[#FF5B4A] animate-ping" />
          <span>Starting POS System...</span>
        </div>
      </div>

      {/* Skip Button */}
      <button 
        onClick={onFinish}
        className="absolute bottom-6 right-6 px-4 py-2 glass-pill text-xs font-bold tracking-wider uppercase transition-all cursor-pointer"
      >
        Skip &rarr;
      </button>
    </div>
  );
}
