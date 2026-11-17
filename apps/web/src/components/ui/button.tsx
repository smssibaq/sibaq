import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-sm',
        secondary: 'bg-secondary text-foreground hover:bg-surface-subtle border border-border',
        outline: 'border border-border bg-transparent hover:bg-surface-subtle text-foreground',
        ghost: 'hover:bg-surface-subtle text-foreground',
        danger: 'bg-danger text-white hover:opacity-90 shadow-sm',
      },
      size: {
        default: 'h-11 px-5 py-2 text-sm min-h-control',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-12 px-8 text-base min-h-control',
        icon: 'h-11 w-11 min-h-control',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(buttonVariants({ variant, size }), className))}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

