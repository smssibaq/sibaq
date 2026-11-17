import React from 'react';
import { useAuth } from './auth-provider';
import { ProtectedRoute } from './protected-route';
import { ErrorState } from '../../components/common/error-state';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return <ProtectedRoute>{null}</ProtectedRoute>;
  }

  if (role !== 'admin') {
    return (
      <ProtectedRoute>
        <div className="py-12">
          <ErrorState
            title="Administrator Access Required"
            message="Your account does not have permission to view the administrator portal. Please contact a project administrator to grant access."
            code="FORBIDDEN"
            onRetry={() => (window.location.href = '/dashboard')}
          />
        </div>
      </ProtectedRoute>
    );
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
}

