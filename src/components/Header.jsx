import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  TrendingUp, 
  History, 
  UtensilsCrossed, 
  Printer, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Menu, 
  X,
  Banknote,
  CreditCard,
  Download
} from 'lucide-react';

import { bluetoothPrinter } from '../services/bluetoothPrinter';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  todaySummary, 
  soundEnabled, 
  setSoundEnabled, 
  onReplayIntro,
  onTriggerPWAInstall,
  isInstalled
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [printerStatus, setPrinterStatus] = useState(bluetoothPrinter.getStatus());

  // Live printer status listener
  useEffect(() => {
    return bluetoothPrinter.onStatusChange(setPrinterStatus);
  }, []);

  // Live real-time ticking clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const navTabs = [
    { id: 'billing', label: 'POS Billing', hotkey: 'F1', icon: ShoppingCart },
    { id: 'daily', label: 'Daily Earnings', hotkey: 'F2', icon: TrendingUp },
    { id: 'history', label: 'Bill History', hotkey: 'F3', icon: History },
    { id: 'menu', label: 'Menu Admin', hotkey: 'F4', icon: UtensilsCrossed },
  ];

  return (
    <header className="sticky top-0 z-40 glass-surface px-4 py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-sm shrink-0 select-none">
      
      {/* Left: Official Brand Logo Capsule (White Background) */}
      <div className="flex items-center justify-between w-full md:w-auto">
        <div className="flex items-center gap-3">
          <div className="bg-white px-3 py-1 rounded-2xl flex items-center justify-center border border-[#D8E1EC] shadow-sm">
            <img 
              src="/eat-and-drink.png" 
              alt="EAT & DRINK MANGALAGIRI" 
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </div>

          {/* Live Date & Time Clock Widget */}
          <div className="hidden xl:flex items-center gap-2 glass-pill px-3.5 py-1.5 rounded-2xl">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase text-[#697586] tracking-wider">
                {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
              </span>
              <span className="text-xs text-[#FF5B4A] font-mono font-black">
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Subtle Printer Status Indicator */}
          {printerStatus !== 'unconfigured' && (
            <div className="hidden lg:flex items-center gap-1.5 glass-pill px-3 py-1.5 rounded-2xl text-[11px] font-bold">
              {printerStatus === 'connected' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-700">Printer Ready</span>
                </>
              )}
              {printerStatus === 'reconnecting' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-amber-700">Reconnecting</span>
                </>
              )}
              {printerStatus === 'offline' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-rose-700">Printer Offline</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mobile Action Controls & Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          {!isInstalled && onTriggerPWAInstall && (
            <button
              onClick={onTriggerPWAInstall}
              className="px-2.5 py-1.5 rounded-2xl glass-btn-coral flex items-center gap-1 text-[11px] font-black cursor-pointer shadow-xs active:scale-95"
              title="Install App"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-2xl glass-pill text-[#697586] hover:text-[#18202B]"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#FF5B4A]" /> : <VolumeX className="w-4 h-4 text-[#98A2B3]" />}
          </button>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-2xl glass-pill text-[#18202B]"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 text-[#FF5B4A]" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Center: Live Today Sales Summary Frosted Capsules */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
        {/* Today Total */}
        <div className="glass-surface rounded-2xl px-4 py-1.5 flex flex-col items-start min-w-[105px] border-[#FF5B4A]/20">
          <span className="text-[9px] font-bold uppercase text-[#697586] tracking-wider">Today's Sales</span>
          <span className="text-xs sm:text-sm font-black text-[#FF5B4A] font-mono">₹{(todaySummary?.totalSales || 0).toLocaleString('en-IN')}</span>
        </div>

        {/* Bills Count */}
        <div className="glass-pill rounded-2xl px-3.5 py-1.5 flex flex-col items-start min-w-[65px]">
          <span className="text-[9px] font-bold uppercase text-[#697586] tracking-wider">Bills</span>
          <span className="text-xs sm:text-sm font-black text-[#18202B] font-mono">{todaySummary?.billCount || 0}</span>
        </div>

        {/* Cash Sales */}
        <div className="glass-pill rounded-2xl px-3.5 py-1.5 flex flex-col items-start min-w-[85px]">
          <span className="text-[9px] font-bold uppercase text-emerald-700 tracking-wider">Cash</span>
          <span className="text-xs sm:text-sm font-black text-emerald-600 font-mono">₹{(todaySummary?.cashSales || 0).toLocaleString('en-IN')}</span>
        </div>

        {/* UPI Sales */}
        <div className="glass-pill rounded-2xl px-3.5 py-1.5 flex flex-col items-start min-w-[85px]">
          <span className="text-[9px] font-bold uppercase text-sky-700 tracking-wider">UPI / Online</span>
          <span className="text-xs sm:text-sm font-black text-sky-600 font-mono">₹{(todaySummary?.upiSales || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Right: Quick Action Controls (Desktop Floating Capsules) */}
      <div className="hidden md:flex items-center gap-2">
        {!isInstalled && onTriggerPWAInstall && (
          <button
            onClick={onTriggerPWAInstall}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black glass-btn-coral cursor-pointer shadow-md active:scale-95"
            title="Install Application on Desktop/Mobile"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('menu')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'menu'
              ? 'glass-pill-active font-black'
              : 'glass-pill text-[#18202B]'
          }`}
          title="Menu Administration"
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>Menu Admin</span>
        </button>

        {/* Utilities */}
        <div className="flex items-center gap-1.5 pl-1.5 border-l border-[#D8E1EC]">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-full glass-pill text-[#697586] hover:text-[#18202B] cursor-pointer"
            title={soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#FF5B4A]" /> : <VolumeX className="w-3.5 h-3.5 text-[#98A2B3]" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full glass-pill text-[#697586] hover:text-[#18202B] cursor-pointer"
            title="Toggle Fullscreen POS"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onReplayIntro}
            className="p-2 rounded-full glass-pill text-[#697586] hover:text-[#18202B] cursor-pointer"
            title="Replay Brand Intro Animation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden w-full pt-2 border-t border-[#D8E1EC] grid grid-cols-2 gap-2 animate-pop-in">
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'glass-pill-active font-black'
                    : 'glass-pill text-[#18202B]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}


