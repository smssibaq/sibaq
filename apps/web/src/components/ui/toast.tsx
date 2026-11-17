import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { clsx } from 'clsx';

export type ToastType = 'success' | 'danger' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message }]);

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const toastHelpers = {
    success: (title: string, message?: string) =>
      addToast({ type: 'success', title, message }),
    error: (title: string, message?: string) =>
      addToast({ type: 'danger', title, message }),
    warning: (title: string, message?: string) =>
      addToast({ type: 'warning', title, message }),
    info: (title: string, message?: string) =>
      addToast({ type: 'info', title, message }),
  };

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        toast: toastHelpers,
      }}
    >
      {children}
      {/* Toast viewport */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-24 z-[60] flex flex-col gap-2 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-full sm:max-w-sm"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={clsx(
              'pointer-events-auto flex items-start gap-3 rounded-xl border p-3 shadow-dropdown sm:p-4 animate-in slide-in-from-bottom-5 duration-200 bg-surface',
              item.type === 'success' && 'border-success/30 text-success',
              item.type === 'danger' && 'border-danger/30 text-danger',
              item.type === 'warning' && 'border-warning/30 text-warning',
              item.type === 'info' && 'border-info/30 text-info'
            )}
          >
            <div className="flex-shrink-0 mt-0.5">
              {item.type === 'success' && <CheckCircle className="h-5 w-5" />}
              {item.type === 'danger' && <AlertCircle className="h-5 w-5" />}
              {item.type === 'warning' && <AlertTriangle className="h-5 w-5" />}
              {item.type === 'info' && <Info className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1 break-words">
              <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
              {item.message && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {item.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(item.id)}
              className="text-muted-foreground hover:text-foreground rounded p-1"
              aria-label="Dismiss toast"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

