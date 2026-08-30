import { useState, useEffect } from 'react';

const DISMISSED_SESSION_KEY = 'eat_drink_pwa_session_dismissed';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    // 1. Check if running in standalone mode (installed)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      (typeof document !== 'undefined' && document.referrer.includes('android-app://'));

    setIsInstalled(isStandalone);
    if (isStandalone) {
      setShowPrompt(false);
      return;
    }

    // 2. Listen for beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      setShowPrompt(true);
    };

    // 3. Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowPrompt(false);
      setShowGuideModal(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 4. Fallback timer: Show install prompt after 1.5 seconds if not installed and not dismissed in current session
    const timer = setTimeout(() => {
      const isSessionDismissed = sessionStorage.getItem(DISMISSED_SESSION_KEY) === 'true';
      if (!isStandalone && !isSessionDismissed) {
        setShowPrompt(true);
      }
    }, 1500);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setShowPrompt(false);
          setDeferredPrompt(null);
          return true;
        }
      } catch (err) {
        console.error('PWA install prompt error:', err);
      }
    }
    
    // If browser prompt is not directly available, show step-by-step guide
    setShowGuideModal(true);
    return false;
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    sessionStorage.setItem(DISMISSED_SESSION_KEY, 'true');
  };

  const closeGuideModal = () => {
    setShowGuideModal(false);
  };

  return {
    isInstallable,
    isInstalled,
    showPrompt,
    showGuideModal,
    triggerInstall,
    dismissPrompt,
    closeGuideModal
  };
}

