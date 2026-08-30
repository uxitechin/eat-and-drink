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
import InstallPromptModal, { InstallGuideModal } from './components/InstallPromptModal';
import { usePWAInstall } from './hooks/usePWAInstall';

import { 
  getCategories, 
  getItems, 
  getTodaySummary, 
  getPrinterSettings, 
  savePrinterSettings,
  saveConfirmedBill,
  fetchRemoteCategories,
  fetchRemoteItems,
  fetchRemoteBills,
  fetchRemoteDailySummary
} from './services/storage';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { printReceipt } from './services/printer';

export default function App() {
  const [showStartup, setShowStartup] = useState(true);
  const [activeTab, setActiveTab] = useState('billing'); // 'billing', 'daily', 'history', 'menu', 'printer'
  
  // PWA Installation Hook
  const { 
    isInstallable, 
    isInstalled, 
    showPrompt, 
    showGuideModal, 
    triggerInstall, 
    dismissPrompt, 
    closeGuideModal 
  } = usePWAInstall();

  // App data state
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [printerSettings, setPrinterSettings] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Active bill preview modal state
  const [previewBill, setPreviewBill] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Bottom Navigation tabs definition (4 Core Modules)
  const bottomTabs = [
    { id: 'billing', label: 'POS Billing', shortLabel: 'POS', hotkey: 'F1', icon: ShoppingCart },
    { id: 'daily', label: 'Daily Earnings', shortLabel: 'Earnings', hotkey: 'F2', icon: TrendingUp },
    { id: 'history', label: 'Bill History', shortLabel: 'History', hotkey: 'F3', icon: History },
    { id: 'menu', label: 'Menu Admin', shortLabel: 'Menu', hotkey: 'F4', icon: UtensilsCrossed },
  ];

  // Load initial data (Instant local cache + Async Supabase sync)
  useEffect(() => {
    // 1. Instant local load
    setCategories(getCategories());
    setItems(getItems());
    setTodaySummary(getTodaySummary());
    const loadedSettings = getPrinterSettings();
    setPrinterSettings(loadedSettings);
    setSoundEnabled(loadedSettings?.soundEnabled ?? true);

    // 2. Async Supabase Sync
    if (isSupabaseConfigured) {
      fetchRemoteCategories().then(cats => cats && setCategories(cats));
      fetchRemoteItems().then(itms => itms && setItems(itms));
      fetchRemoteBills().then(() => {
        fetchRemoteDailySummary().then(s => s && setTodaySummary(s));
      });

      // 3. Realtime subscription on bills
      const channel = supabase
        .channel('public:bills')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bills' }, () => {
          fetchRemoteBills().then(() => {
            fetchRemoteDailySummary().then(s => s && setTodaySummary(s));
          });
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
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

  // Keyboard navigation shortcuts (F1-F4)
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle bill confirmation from cashier (Supabase Primary)
  const handleConfirmBill = useCallback(async (billPayload) => {
    // 1. Save bill in Supabase & local cache
    const savedBill = await saveConfirmedBill(billPayload);

    // 2. Refresh live today's summary counters from Supabase
    const updatedSummary = await fetchRemoteDailySummary();
    setTodaySummary(updatedSummary);

    // 3. Open Bill Preview Modal
    setPreviewBill(savedBill);
    setIsPreviewModalOpen(true);
    return savedBill;
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
            onTriggerPWAInstall={triggerInstall}
            isInstalled={isInstalled}
          />

          {/* Main Content Area (With bottom padding for floating navigation on mobile) */}
          <main className="flex-1 flex overflow-hidden pb-18 sm:pb-0">
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
                printerSettings={printerSettings}
                setPrinterSettings={setPrinterSettings}
                soundEnabled={soundEnabled}
                setSoundEnabled={handleSoundChange}
                onTriggerPWAInstall={triggerInstall}
                isAppInstalled={isInstalled}
              />
            )}
          </main>

          {/* Floating Frosted Glass Bottom Navigation Bar (Guaranteed Centered 4 Items) */}
          <div className="fixed bottom-[max(10px,env(safe-area-inset-bottom))] left-0 right-0 z-40 flex justify-center px-3 pointer-events-none">
            <nav className="w-full max-w-md sm:max-w-lg glass-surface px-2.5 py-1.5 rounded-full border border-white/95 shadow-2xl backdrop-blur-2xl pointer-events-auto">
              <div className="grid grid-cols-4 gap-1.5 w-full">
                {bottomTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center justify-center gap-1 sm:gap-2 py-2 px-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 shadow-xs w-full ${
                        isActive
                          ? 'glass-btn-coral font-black'
                          : 'glass-pill text-[#18202B]'
                      }`}
                      title={`Switch to ${tab.label} (${tab.hotkey})`}
                    >
                      <Icon className="w-4 h-4 stroke-[2.2] shrink-0" />
                      <span className="text-[11px] sm:text-xs font-bold truncate">{tab.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Custom PWA Install Prompt Banner / Popup */}
          {showPrompt && !isInstalled && (
            <InstallPromptModal 
              onInstall={triggerInstall} 
              onDismiss={dismissPrompt} 
            />
          )}

          {/* Step-by-Step Manual Installation Guide Dialog */}
          {showGuideModal && !isInstalled && (
            <InstallGuideModal 
              onClose={closeGuideModal} 
            />
          )}

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
