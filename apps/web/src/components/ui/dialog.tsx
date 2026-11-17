import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: DialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'dialog-title' : undefined}
      aria-describedby={description ? 'dialog-description' : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={twMerge(
          clsx(
            'relative w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-modal animate-in zoom-in-95 duration-200',
            className
          )
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h2 id="dialog-title" className="text-lg font-semibold text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p id="dialog-description" className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

