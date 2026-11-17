import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { logDiagnostic } from '../../lib/errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logDiagnostic('Unhandled React Boundary Exception', {
      error,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger mb-4">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Application Error
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              An unexpected client error occurred. Your state has been preserved safely.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={this.handleReset} className="w-full">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reload Application
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
