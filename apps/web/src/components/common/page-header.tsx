import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 mb-4 sm:pb-6 sm:mb-6 border-b border-border',
          className
        )
      )}
    >
      <div className="space-y-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-foreground truncate">
            {title}
          </h1>
          {badge && (
            <span className="inline-flex items-center whitespace-nowrap rounded-full bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 text-[10px] md:text-xs font-bold uppercase tracking-wider shrink-0 leading-none">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export const AppPageHeader = PageHeader;
