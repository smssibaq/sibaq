import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        // Periodically check for service worker updates (every hour)
        setInterval(() => {
          registration.update().catch((err) => {
            console.debug('Periodic SW update check failed:', err);
          });
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('PWA service worker registration error:', error);
    },
  });

  const handleUpdate = async () => {
    try {
      await updateServiceWorker(true);
    } catch (err) {
      console.error('Failed to update service worker:', err);
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) {
    return null;
  }

  return (
    <aside
      aria-label="Application Update Notice"
      className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-50 max-w-sm w-[calc(100vw-1.5rem)] rounded-2xl border border-primary/30 bg-surface/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground">Update Available</h3>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg p-1 text-muted-foreground hover:bg-surface-subtle hover:text-foreground transition-colors"
              aria-label="Dismiss update prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            A new version of Kalikkanundo is ready with updates and improvements.
          </p>

          <div className="mt-3.5 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-8 px-3 text-xs font-bold gap-1.5"
              onClick={handleUpdate}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Update Now
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleDismiss}
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
