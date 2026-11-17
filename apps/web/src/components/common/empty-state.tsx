import React from 'react';
import { FolderOpen, SearchX, Plus, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  isSearchEmpty?: boolean;
}

export function EmptyState({
  title,
  description,
  icon,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  isSearchEmpty = false,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[240px] sm:min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface p-5 sm:p-8 text-center animate-in fade-in duration-200">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-4">
        {icon ? (
          icon
        ) : isSearchEmpty ? (
          <SearchX className="h-6 w-6" />
        ) : (
          <FolderOpen className="h-6 w-6" />
        )}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>

      {(onAction || onSecondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onSecondaryAction && secondaryActionText && (
            <Button variant="outline" size="sm" onClick={onSecondaryAction}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {secondaryActionText}
            </Button>
          )}
          {onAction && actionText && (
            <Button size="sm" onClick={onAction}>
              <Plus className="mr-1.5 h-4 w-4" />
              {actionText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

