import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingCart, 
  TrendingUp, 
  History, 
  UtensilsCrossed, 
  Printer 
} from 'lucide-react';
import Header from './components/Header';
import BillingDashboard from './components/BillingDashboard';
import DailyEarnings from './components/DailyEarnings';
import BillHistory from './components/BillHistory';
import MenuManagement from './components/MenuManagement';
import PrinterSettings from './components/PrinterSettings';
import BillPreviewModal from './components/BillPreviewModal';
import StartupAnimation from './components/StartupAnimation';

import { 
  getCategories, 
  getItems, 
  getTodaySummary, 
  saveConfirmedBill, 
  getPrinterSettings,
  savePrinterSettings
} from './services/storage';
import { printReceipt } from './services/printer';

export default function App() {
  const [showStartup, setShowStartup] = useState(true);
  const [activeTab, setActiveTab] = useState('billing'); // 'billing', 'daily', 'history', 'menu', 'printer'
  
  // App data state
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [printerSettings, setPrinterSettings] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Active bill preview modal state
  const [previewBill, setPreviewBill] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Bottom Navigation tabs definition
  const bottomTabs = [
    { id: 'billing', label: 'POS Billing', hotkey: 'F1', icon: ShoppingCart },
    { id: 'daily', label: 'Daily Earnings', hotkey: 'F2', icon: TrendingUp },
    { id: 'history', label: 'Bill History', hotkey: 'F3', icon: History },
    { id: 'menu', label: 'Menu Admin', hotkey: 'F4', icon: UtensilsCrossed },
    { id: 'printer', label: 'Printer Settings', hotkey: 'F5', icon: Printer },
  ];

  // Load initial data
  useEffect(() => {
    const loadedCats = getCategories();
    const loadedItems = getItems();
    const loadedSummary = getTodaySummary();
    const loadedSettings = getPrinterSettings();

    setCategories(loadedCats);
    setItems(loadedItems);
    setTodaySummary(loadedSummary);
    setPrinterSettings(loadedSettings);
    setSoundEnabled(loadedSettings?.soundEnabled ?? true);
  }, []);

  // Sync sound settings changes
  const handleSoundChange = (enabled) => {
    setSoundEnabled(enabled);
    if (printerSettings) {
      const updated = { ...printerSettings, soundEnabled: enabled };
      setPrinterSettings(updated);
      savePrinterSettings(updated);
    }
  };

  // Keyboard navigation shortcuts (F1-F5)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('billing');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('daily');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('history');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('menu');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setActiveTab('printer');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle bill confirmation from cashier
  const handleConfirmBill = useCallback((billPayload) => {
    // 1. Save bill and update sales totals in persistent store
    const savedBill = saveConfirmedBill(billPayload);

    // 2. Refresh live today's summary counters
    setTodaySummary(getTodaySummary());

    // 3. Open Bill Preview Modal
    setPreviewBill(savedBill);
    setIsPreviewModalOpen(true);
  }, []);

  // Handle direct print from Bill History
  const handlePrintExistingBill = async (bill) => {
    setPreviewBill(bill);
    setIsPreviewModalOpen(true);
  };

  return (
    <div className="min-h-screen text-[#18202B] flex flex-col font-sans select-none overflow-hidden">
      {/* 1. Startup 3-Second Logo Intro Animation */}
      {showStartup ? (
        <StartupAnimation onFinish={() => setShowStartup(false)} />
      ) : (
        <>
          {/* Main Top Header */}
          <Header 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            todaySummary={todaySummary}
            soundEnabled={soundEnabled}
            setSoundEnabled={handleSoundChange}
            onReplayIntro={() => setShowStartup(true)}
          />

          {/* Main Content Area */}
          <main className="flex-1 flex overflow-hidden">
            {activeTab === 'billing' && (
              <BillingDashboard 
                categories={categories}
                items={items}
                onConfirmBill={handleConfirmBill}
                soundEnabled={soundEnabled}
              />
            )}

            {activeTab === 'daily' && (
              <DailyEarnings 
                todaySummary={todaySummary}
              />
            )}

            {activeTab === 'history' && (
              <BillHistory 
                onSelectBillForPreview={(bill) => {
                  setPreviewBill(bill);
                  setIsPreviewModalOpen(true);
                }}
                onPrintBill={handlePrintExistingBill}
              />
            )}

            {activeTab === 'menu' && (
              <MenuManagement 
                categories={categories}
                setCategories={setCategories}
                items={items}
                setItems={setItems}
              />
            )}

            {activeTab === 'printer' && (
              <PrinterSettings 
                settings={printerSettings}
                setSettings={setPrinterSettings}
                soundEnabled={soundEnabled}
                setSoundEnabled={handleSoundChange}
              />
            )}
          </main>

          {/* Frosted Glass Bottom Navigation Bar */}
          <nav className="shrink-0 glass-surface px-4 py-2 flex items-center justify-center shadow-lg z-30 border-t border-white/90">
            <div className="flex items-center gap-2 max-w-4xl w-full justify-around sm:justify-center sm:gap-3.5">
              {bottomTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 shadow-xs ${
                      isActive
                        ? 'glass-pill-active font-black'
                        : 'glass-pill text-[#18202B]'
                    }`}
                    title={`Switch to ${tab.label} (${tab.hotkey})`}
                  >
                    <Icon className="w-4 h-4 stroke-[2.2]" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className={`hidden md:inline text-[9px] px-1.5 py-0.2 rounded font-mono ${isActive ? 'bg-black/20 text-white' : 'bg-[#D8E1EC]/60 text-[#697586]'}`}>
                      {tab.hotkey}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Bill Preview & Receipt Printing Modal */}
          {isPreviewModalOpen && previewBill && (
            <BillPreviewModal 
              bill={previewBill}
              printerSettings={printerSettings}
              onClose={() => {
                setIsPreviewModalOpen(false);
                setPreviewBill(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
