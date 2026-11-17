import { useEffect, useState, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { sanitizeReturnUrl } from './auth-provider';
import { Spinner } from '../../components/ui/spinner';
import { AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';

export function CallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const searchParams = new URLSearchParams(window.location.search);
    const returnUrl = sanitizeReturnUrl(searchParams.get('returnUrl'));
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      setError(errorDescription || 'Authentication failed. Please try again.');
      return;
    }

    if (!isSupabaseConfigured) {
      window.location.href = returnUrl;
      return;
    }

    // Subscribe to auth state changes - detectSessionInUrl may resolve the session automatically
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        window.location.href = returnUrl;
      }
    });

    async function processCallback() {
      // 1. Check if session was already established by detectSessionInUrl
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      if (existingSession) {
        window.location.href = returnUrl;
        return;
      }

      const code = searchParams.get('code');

      if (code) {
        try {
          const { data, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            // Check once more in case detectSessionInUrl finished concurrently
            const {
              data: { session: retrySession },
            } = await supabase.auth.getSession();

            if (retrySession) {
              window.location.href = returnUrl;
              return;
            }

            setError(exchangeError.message);
            return;
          }

          if (data.session) {
            window.location.href = returnUrl;
            return;
          }
        } catch (err) {
          const {
            data: { session: fallbackSession },
          } = await supabase.auth.getSession();

          if (fallbackSession) {
            window.location.href = returnUrl;
            return;
          }

          setError(
            err instanceof Error
              ? err.message
              : 'Failed to complete session exchange.'
          );
        }
      } else {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          window.location.href = returnUrl;
        } else {
          setError('No authentication token was received from provider.');
        }
      }
    }

    processCallback();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger mb-4">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Sign In Failed
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {error}
          </p>
          <div className="mt-6">
            <Button onClick={() => (window.location.href = '/login')}>
              Return to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <Spinner size="lg" />
      <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse">
        Completing secure sign in...
      </p>
    </div>
  );
}
