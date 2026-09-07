import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShoppingCart, 
  TrendingUp, 
  History, 
  UtensilsCrossed 
} from 'lucide-react';
import Header from './components/Header';
import BillingDashboard from './components/BillingDashboard';
import DailyEarnings from './components/DailyEarnings';
import BillHistory from './components/BillHistory';
import MenuManagement from './components/MenuManagement';
import BillPreviewModal from './components/BillPreviewModal';
import StartupAnimation from './components/StartupAnimation';
import InstallPromptModal, { InstallGuideModal } from './components/InstallPromptModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { usePWAInstall } from './hooks/usePWAInstall';
import { logger, APP_VERSION } from './services/logger';

import { 
  getCategories, 
  getItems, 
  getAllBills,
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

export default function App() {
  const [showStartup, setShowStartup] = useState(true);
  const [activeTab, setActiveTab] = useState('billing'); // 'billing', 'daily', 'history', 'menu'
  const [syncStatus, setSyncStatus] = useState({ online: typeof navigator !== 'undefined' ? navigator.onLine : true, syncing: false });

  // PWA Installation Hook
  const { 
    isInstalled, 
    showPrompt, 
    showGuideModal, 
    triggerInstall, 
    dismissPrompt, 
    closeGuideModal 
  } = usePWAInstall();

  // App data state (Instantly initialized with safe cached/default values)
  const [categories, setCategories] = useState(() => getCategories());
  const [items, setItems] = useState(() => getItems());
  const [bills, setBills] = useState(() => getAllBills());
  const [todaySummary, setTodaySummary] = useState(() => getTodaySummary());
  const [printerSettings, setPrinterSettings] = useState(() => getPrinterSettings());
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const s = getPrinterSettings();
    return s?.soundEnabled ?? true;
  });

  // Active bill preview modal state
  const [previewBill, setPreviewBill] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Bottom Navigation tabs definition (4 Core Modules)
  const bottomTabs = useMemo(() => [
    { id: 'billing', label: 'POS Billing', shortLabel: 'POS', hotkey: 'F1', icon: ShoppingCart },
    { id: 'daily', label: 'Daily Earnings', shortLabel: 'Earnings', hotkey: 'F2', icon: TrendingUp },
    { id: 'history', label: 'Bill History', shortLabel: 'History', hotkey: 'F3', icon: History },
    { id: 'menu', label: 'Menu Admin', shortLabel: 'Menu', hotkey: 'F4', icon: UtensilsCrossed },
  ], []);

  // Synchronize remote data cleanly without overwriting if offline/error
  const syncRemoteData = useCallback(async () => {
    if (!isSupabaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return;
    }

    setSyncStatus(prev => ({ ...prev, syncing: true }));

    try {
      const [remoteCats, remoteItems, remoteBills, remoteSummary] = await Promise.allSettled([
        fetchRemoteCategories(),
        fetchRemoteItems(),
        fetchRemoteBills(),
        fetchRemoteDailySummary()
      ]);

      if (remoteCats.status === 'fulfilled' && remoteCats.value && remoteCats.value.length > 0) {
        setCategories(remoteCats.value);
      }
      if (remoteItems.status === 'fulfilled' && remoteItems.value && remoteItems.value.length > 0) {
        setItems(remoteItems.value);
      }
      if (remoteBills.status === 'fulfilled' && remoteBills.value && Array.isArray(remoteBills.value)) {
        setBills(remoteBills.value);
      }
      if (remoteSummary.status === 'fulfilled' && remoteSummary.value) {
        setTodaySummary(remoteSummary.value);
      }
    } catch (err) {
      logger.warn('App', 'Non-blocking sync error', err);
    } finally {
      setSyncStatus(prev => ({ ...prev, syncing: false }));
    }
  }, []);

  // Online / Offline network event listeners
  useEffect(() => {
    const handleOnline = () => {
      logger.info('Network', 'Application came online');
      setSyncStatus({ online: true, syncing: false });
      syncRemoteData();
    };
    const handleOffline = () => {
      logger.warn('Network', 'Application is offline. Using local cached data.');
      setSyncStatus({ online: false, syncing: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncRemoteData]);

  // Safe Application Startup: Purely READ ONLY synchronization
  useEffect(() => {
    let isMounted = true;
    logger.info('App', `Initializing EAT & DRINK POS v${APP_VERSION}`);

    syncRemoteData();

    // Realtime subscription for multi-terminal sync
    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('public:bills')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bills' }, () => {
          if (isMounted) {
            fetchRemoteBills().then(latestBills => {
              if (isMounted && latestBills) {
                setBills(latestBills);
              }
              return fetchRemoteDailySummary();
            }).then(s => {
              if (s && isMounted) setTodaySummary(s);
            }).catch(e => logger.warn('App', 'Realtime sync error', e));
          }
        })
        .subscribe();

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [syncRemoteData]);

  // Sync sound settings changes
  const handleSoundChange = useCallback((enabled) => {
    setSoundEnabled(enabled);
    setPrinterSettings(prev => {
      const updated = { ...(prev || {}), soundEnabled: enabled };
      savePrinterSettings(updated);
      return updated;
    });
  }, []);

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

  // Handle bill confirmation from cashier (Idempotent & Transaction Safe)
  const handleConfirmBill = useCallback(async (billPayload) => {
    // 1. Save bill in Supabase (Authoritative Atomic Transaction)
    const savedBill = await saveConfirmedBill(billPayload);

    // 2. Reactively update local bills state without duplication
    setBills(prev => {
      const exists = prev.some(b => b.id === savedBill.id || (b.idempotencyKey && b.idempotencyKey === savedBill.idempotencyKey));
      return exists ? prev : [savedBill, ...prev];
    });

    // 3. Refresh live today's summary counters
    fetchRemoteDailySummary().then(updatedSummary => {
      if (updatedSummary) {
        setTodaySummary(updatedSummary);
      }
    }).catch(() => {});

    // 4. Open Bill Preview Modal
    setPreviewBill(savedBill);
    setIsPreviewModalOpen(true);
    return savedBill;
  }, []);

  // Handle direct print from Bill History (Read-only reprint)
  const handlePrintExistingBill = useCallback((bill) => {
    setPreviewBill(bill);
    setIsPreviewModalOpen(true);
  }, []);

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
            isOnline={syncStatus.online}
          />

          {/* Main Content Area with Component-Level Error Boundary Isolation */}
          <main className="flex-1 flex overflow-hidden pb-18 sm:pb-0">
            <ErrorBoundary onGoToPOS={() => setActiveTab('billing')}>
              {activeTab === 'billing' && (
                <BillingDashboard 
                  categories={categories}
                  items={items}
                  onConfirmBill={handleConfirmBill}
                  soundEnabled={soundEnabled}
                  onTriggerPWAInstall={triggerInstall}
                  isInstalled={isInstalled}
                />
              )}

              {activeTab === 'daily' && (
                <DailyEarnings 
                  todaySummary={todaySummary}
                  bills={bills}
                  onRefresh={syncRemoteData}
                />
              )}

              {activeTab === 'history' && (
                <BillHistory 
                  bills={bills}
                  onSelectBillForPreview={(bill) => {
                    setPreviewBill(bill);
                    setIsPreviewModalOpen(true);
                  }}
                  onPrintBill={handlePrintExistingBill}
                  onRefresh={syncRemoteData}
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
            </ErrorBoundary>
          </main>

          {/* Floating Frosted Glass Bottom Navigation Bar */}
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

          {/* Custom PWA Install Prompt Banner */}
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

          {/* Bill Preview & Receipt Printing Modal (Isolated Hardware Actions) */}
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
