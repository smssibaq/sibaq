import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  isInvalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, isInvalid, disabled, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={twMerge(
          clsx(
            'flex min-h-[96px] w-full rounded-md border bg-surface px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
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

Textarea.displayName = 'Textarea';

