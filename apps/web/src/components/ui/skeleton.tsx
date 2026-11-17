import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={twMerge(
        clsx('animate-pulse rounded-md bg-secondary/70', className)
      )}
      {...props}
    />
  );
}

