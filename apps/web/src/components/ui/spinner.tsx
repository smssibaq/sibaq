import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'default' | 'lg';
}

const SIZE_MAP = {
  sm: 'h-4 w-4',
  default: 'h-6 w-6',
  lg: 'h-10 w-10',
};

export function Spinner({ size = 'default', className, ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={twMerge(clsx('flex items-center justify-center text-primary', className))}
      {...props}
    >
      <Loader2 className={clsx('animate-spin', SIZE_MAP[size])} />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

