import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={twMerge(clsx('flex flex-col space-y-1.5 text-left', className))}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-foreground select-none"
        >
          {label}
          {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

