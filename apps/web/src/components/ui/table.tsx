import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Table({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-auto">
      <table
        className={twMerge(
          clsx('w-full caption-bottom text-sm text-foreground', className)
        )}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={twMerge(clsx('[&_tr]:border-b border-border bg-surface-subtle', className))}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={twMerge(clsx('[&_tr:last-child]:border-0', className))}
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={twMerge(
        clsx(
          'border-b border-border transition-colors hover:bg-surface-subtle/50 data-[state=selected]:bg-secondary',
          className
        )
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={twMerge(
        clsx(
          'h-11 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
          className
        )
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={twMerge(
        clsx('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)
      )}
      {...props}
    />
  );
}

