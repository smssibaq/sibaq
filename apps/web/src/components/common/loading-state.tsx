import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BrandLogo } from './brand-logo';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading Kalikkanundo data...', className }: LoadingStateProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-border bg-surface p-8 text-center shadow-card',
          className
        )
      )}
    >
      <div className="relative flex items-center justify-center">
        <BrandLogo size="md" showName={false} className="animate-pulse" />
      </div>
      <p className="mt-4 text-sm font-semibold text-muted-foreground animate-pulse">
        {message}
      </p>
    </div>
  );
}

export const AppLoadingState = LoadingState;
