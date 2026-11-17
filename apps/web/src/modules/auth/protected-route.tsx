import React from 'react';
import { useAuth } from './auth-provider';
import { ErrorState } from '@/components/common/error-state';
import { profileErrorMessage } from '@/modules/profile/api';
import { AppLayout } from '../../components/common/app-layout';
import { Skeleton } from '../../components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
  noLayout?: boolean;
}

export function ProtectedRoute({
  children,
  requireProfile = true,
  noLayout = false,
}: ProtectedRouteProps) {
  const { user, needsOnboarding, isLoading, profileError, refreshProfile } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <div className="w-64 border-r border-border p-6 space-y-4 hidden lg:block">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 p-8 space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    const currentPath =
      typeof window !== 'undefined'
        ? window.location.pathname + window.location.search + window.location.hash
        : '/dashboard';
    window.location.href = `/login?returnUrl=${encodeURIComponent(currentPath)}`;
    return null;
  }

  if (profileError) return <ErrorState title="Unable to load your profile" message={profileErrorMessage(profileError)} onRetry={() => { void refreshProfile().catch(() => {}); }} />;

  // Completion is sport-independent; football positions are optional.
  if (requireProfile && needsOnboarding) {
    const currentPath =
      typeof window !== 'undefined'
        ? window.location.pathname
        : '';
    if (currentPath !== '/profile/setup') {
      const fullUrl =
        typeof window !== 'undefined'
          ? window.location.pathname + window.location.search + window.location.hash
          : '/dashboard';
      window.location.href = `/profile/setup?redirect=${encodeURIComponent(fullUrl)}`;
      return null;
    }
  }

  if (noLayout) {
    return <>{children}</>;
  }

  return <AppLayout>{children}</AppLayout>;
}

