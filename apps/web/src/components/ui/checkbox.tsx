import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  isInvalid?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, isInvalid, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={twMerge(
            clsx(
              'h-5 w-5 rounded border bg-surface text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
              isInvalid ? 'border-danger' : 'border-border',
              className
            )
          )}
          {...props}
        />
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

