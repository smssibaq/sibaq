import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  isInvalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, isInvalid, disabled, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        disabled={disabled}
        className={twMerge(
          clsx(
            'flex h-11 min-h-control w-full rounded-md border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors cursor-pointer',
            isInvalid
              ? 'border-danger focus-visible:ring-danger'
              : 'border-border',
            className
          )
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';

