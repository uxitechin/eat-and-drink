import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'eat_drink_pwa_prompt_dismissed';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Check if running in standalone mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      (typeof document !== 'undefined' && document.referrer.includes('android-app://'));

    setIsInstalled(isStandalone);
    if (isStandalone) return;

    // 2. Listen for beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);

      // Check if user previously dismissed recently (within 24 hours)
      const dismissedTime = localStorage.getItem(DISMISSED_KEY);
      const isRecentlyDismissed = dismissedTime && Date.now() - Number(dismissedTime) < 24 * 60 * 60 * 1000;

      if (!isRecentlyDismissed) {
        setShowPrompt(true);
      }
    };

    // 3. Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem(DISMISSED_KEY);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) {
      alert('To install, open your browser menu (?) and select "Install EAT & DRINK" or "Add to Home screen".');
      return false;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  };

  return {
    isInstallable,
    isInstalled,
    showPrompt,
    triggerInstall,
    dismissPrompt
  };
}
