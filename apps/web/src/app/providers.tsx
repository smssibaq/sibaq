import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../modules/auth/auth-provider';
import { ToastProvider } from '../components/ui/toast';
import { ErrorBoundary } from '../components/common/error-boundary';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minute
            gcTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Conservative retry: do not retry authentication or permission errors
              if (failureCount >= 2) return false;
              if (
                typeof error === 'object' &&
                error !== null &&
                'statusCode' in error
              ) {
                const code = (error as { statusCode?: number }).statusCode;
                if (code === 401 || code === 403 || code === 404) return false;
              }
              return true;
            },
          },
          mutations: {
            retry: false, // Never retry non-idempotent writes automatically
          },
        },
      })
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

