import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  isInvalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', isInvalid, disabled, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        disabled={disabled}
        className={twMerge(
          clsx(
            'flex h-11 min-h-control w-full rounded-md border bg-surface px-3 py-2 text-sm text-foreground shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
            isInvalid
              ? 'border-danger focus-visible:ring-danger'
              : 'border-border',
            className
          )
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

