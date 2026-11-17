import { Dialog } from './dialog';
import { Button } from './button';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex gap-4 items-start pt-2">
        {isDestructive && (
          <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
        <Button
          type="button"
          variant={isDestructive ? 'danger' : 'default'}
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </div>
    </Dialog>
  );
}
