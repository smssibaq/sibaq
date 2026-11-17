import { useState, useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';
import { Download, Share2, X, PlusSquare } from 'lucide-react';
import { Button } from '../ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'kalikkanundo_pwa_install_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIosPromptVisible, setIsIosPromptVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // 1. Detect if already installed / standalone
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((window.navigator as unknown as { standalone?: boolean }).standalone));

    if (isStandalone) {
      return;
    }

    // 2. Check if user recently dismissed
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    setIsDismissed(false);

    // 3. Listen for Chromium/Android beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 4. Check for iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua) && !('MSStream' in window);
    const isSafari = /safari/.test(ua) && !/crios|fxios|optios|edgios/.test(ua);

    if (isIos && isSafari) {
      setIsIosPromptVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, (Date.now() + DISMISS_DURATION_MS).toString());
    setIsDismissed(true);
    setDeferredPrompt(null);
    setIsIosPromptVisible(false);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsDismissed(true);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn('Install prompt failed:', err);
    }
  };

  // Do not show on auth pages or if dismissed
  if (isDismissed || location.pathname === '/login' || location.pathname.startsWith('/auth/')) {
    return null;
  }

  // 1. Chromium / Android / Desktop Install Prompt
  if (deferredPrompt) {
    return (
      <aside
        aria-label="Install Kalikkanundo"
        className="fixed bottom-24 lg:bottom-6 left-3 sm:left-6 z-40 max-w-sm w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <img
              src="/branding/kalikkanundo-logo.svg"
              alt="Kalikkanundo"
              className="h-7 w-7 object-contain"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-foreground">Install Kalikkanundo</h3>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-lg p-1 text-muted-foreground hover:bg-surface-subtle hover:text-foreground transition-colors"
                aria-label="Dismiss install prompt"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Add Kalikkanundo to your home screen for quick access to your turf squads.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="default"
                className="h-8 px-3 text-xs font-bold gap-1.5"
                onClick={handleInstallClick}
              >
                <Download className="h-3.5 w-3.5" />
                Install
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleDismiss}
              >
                Not Now
              </Button>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // 2. iOS Safari Instructions
  if (isIosPromptVisible) {
    return (
      <aside
        aria-label="Install on iPhone / iPad"
        className="fixed bottom-24 left-3 right-3 z-40 mx-auto max-w-sm rounded-2xl border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Share2 className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-foreground">Install on iOS</h3>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-lg p-1 text-muted-foreground hover:bg-surface-subtle hover:text-foreground transition-colors"
                aria-label="Dismiss install instructions"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Tap the Safari <span className="font-semibold text-foreground">Share</span> button below, then scroll and select{' '}
              <span className="font-semibold text-primary inline-flex items-center gap-1">
                <PlusSquare className="h-3 w-3 inline" /> Add to Home Screen
              </span>.
            </p>

            <div className="mt-2.5 flex items-center justify-end">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2.5 text-xs text-primary font-bold hover:bg-primary/10"
                onClick={handleDismiss}
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return null;
}
