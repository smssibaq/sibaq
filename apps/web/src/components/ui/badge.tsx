import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const badgeVariants = cva(
  'inline-flex max-w-full items-center truncate whitespace-nowrap rounded-full px-2 py-0.5 sm:px-2.5 text-[10px] sm:text-xs font-semibold leading-normal transition-colors focus:outline-none select-none shrink-0',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-foreground',
        success: 'border-transparent bg-success text-[#0B1F19]',
        warning: 'border-transparent bg-warning text-[#0B1F19]',
        danger: 'border-transparent bg-danger text-white',
        outline: 'border border-border text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      className={twMerge(clsx(badgeVariants({ variant }), className))}
      {...props}
    />
  );
}

