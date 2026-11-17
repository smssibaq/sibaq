import React from 'react';
import { useAuth } from './auth-provider';
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
  const { user, profile, isLoading } = useAuth();

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
        ? window.location.pathname + window.location.search
        : '/dashboard';
    window.location.href = `/login?returnUrl=${encodeURIComponent(currentPath)}`;
    return null;
  }

  // Redirect un-onboarded players who do not have preferred_position set yet
  if (requireProfile && profile && !profile.preferred_position) {
    const currentPath =
      typeof window !== 'undefined'
        ? window.location.pathname
        : '';
    if (currentPath !== '/profile/setup') {
      const fullUrl =
        typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : '/dashboard';
      window.location.href = `/profile/setup?returnUrl=${encodeURIComponent(fullUrl)}`;
      return null;
    }
  }

  if (noLayout) {
    return <>{children}</>;
  }

  return <AppLayout>{children}</AppLayout>;
}

