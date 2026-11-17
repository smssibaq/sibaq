import { AlertCircle, WifiOff, ShieldAlert, Settings, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import type { ErrorCode } from '../../lib/errors';

export interface ErrorStateProps {
  title?: string;
  message: string;
  code?: ErrorCode;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function ErrorState({
  title,
  message,
  code = 'UNEXPECTED',
  onRetry,
  isRetrying = false,
}: ErrorStateProps) {
  const getIcon = () => {
    switch (code) {
      case 'NETWORK_ERROR':
        return <WifiOff className="h-6 w-6 text-warning" />;
      case 'FORBIDDEN':
      case 'UNAUTHENTICATED':
        return <ShieldAlert className="h-6 w-6 text-danger" />;
      case 'CONFIG_MISSING':
        return <Settings className="h-6 w-6 text-primary" />;
      default:
        return <AlertCircle className="h-6 w-6 text-danger" />;
    }
  };

  const getHeading = () => {
    if (title) return title;
    switch (code) {
      case 'NETWORK_ERROR':
        return 'Network Connection Lost';
      case 'FORBIDDEN':
        return 'Access Restricted';
      case 'CONFIG_MISSING':
        return 'Configuration Required';
      default:
        return 'Something Went Wrong';
    }
  };

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-border bg-surface p-8 text-center shadow-card">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle mb-4">
        {getIcon()}
      </div>
      <h3 className="text-base font-semibold text-foreground">{getHeading()}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground leading-relaxed">
        {message}
      </p>

      {onRetry && (
        <div className="mt-6">
          <Button variant="outline" size="sm" onClick={onRetry} isLoading={isRetrying}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
