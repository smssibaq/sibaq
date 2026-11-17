import { Check, HelpCircle, X, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { AttendanceStatus } from './types';

export interface AttendanceButtonProps {
  currentStatus: AttendanceStatus | null;
  onStatusChange: (status: AttendanceStatus) => void;
  isLoading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AttendanceButton({
  currentStatus,
  onStatusChange,
  isLoading = false,
  disabled = false,
  size: _size = 'md',
  className,
}: AttendanceButtonProps) {
  const isPlaying = currentStatus === 'playing';
  const isMaybe = currentStatus === 'maybe';
  const isNotPlaying = currentStatus === 'not_playing';

  return (
    <div
      role="group"
      aria-label="Attendance RSVP options"
      className={clsx('flex flex-wrap items-center gap-2.5', className)}
    >
      {/* Playing / Going Button */}
      <button
        type="button"
        disabled={disabled || isLoading}
        aria-pressed={isPlaying}
        onClick={() => onStatusChange('playing')}
        className={clsx(
          'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 min-h-[44px] px-4 py-2 text-sm border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          isPlaying
            ? 'bg-primary text-primary-foreground border-primary shadow-md font-bold'
            : 'bg-surface hover:bg-surface-subtle text-foreground border-border hover:border-primary/50',
          (disabled || isLoading) && 'opacity-60 cursor-not-allowed'
        )}
      >
        {isLoading && isPlaying ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Check className={clsx('h-4 w-4 mr-2', isPlaying ? 'text-primary-foreground stroke-[3]' : 'text-primary')} />
        )}
        <span>Playing</span>
      </button>

      {/* Maybe Button */}
      <button
        type="button"
        disabled={disabled || isLoading}
        aria-pressed={isMaybe}
        onClick={() => onStatusChange('maybe')}
        className={clsx(
          'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 min-h-[44px] px-4 py-2 text-sm border focus:outline-none focus-visible:ring-2 focus-visible:ring-warning',
          isMaybe
            ? 'bg-warning/20 text-warning border-warning shadow-sm font-bold'
            : 'bg-surface hover:bg-surface-subtle text-foreground border-border hover:border-warning/50',
          (disabled || isLoading) && 'opacity-60 cursor-not-allowed'
        )}
      >
        {isLoading && isMaybe ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <HelpCircle className={clsx('h-4 w-4 mr-2', isMaybe ? 'text-warning' : 'text-muted-foreground')} />
        )}
        <span>Maybe</span>
      </button>

      {/* Not Playing / Out Button */}
      <button
        type="button"
        disabled={disabled || isLoading}
        aria-pressed={isNotPlaying}
        onClick={() => onStatusChange('not_playing')}
        className={clsx(
          'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 min-h-[44px] px-4 py-2 text-sm border focus:outline-none focus-visible:ring-2 focus-visible:ring-danger',
          isNotPlaying
            ? 'bg-danger/20 text-danger border-danger shadow-sm font-bold'
            : 'bg-surface hover:bg-surface-subtle text-foreground border-border hover:border-danger/50',
          (disabled || isLoading) && 'opacity-60 cursor-not-allowed'
        )}
      >
        {isLoading && isNotPlaying ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <X className={clsx('h-4 w-4 mr-2', isNotPlaying ? 'text-danger' : 'text-muted-foreground')} />
        )}
        <span>Can&apos;t Play</span>
      </button>
    </div>
  );
}
