import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import type { UserRole } from '../../types/database.types';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../infrastructure/query-keys';

export interface UserProfile {
  id: string;
  email?: string;
  display_name: string | null;
  full_name?: string | null;
  avatar_url: string | null;
  preferred_position?: string | null;
  secondary_position?: string | null;
}

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithGoogle: (returnUrl?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ requiresVerification: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Sanitizes a redirect path to ensure it is internal and relative.
 * Prevents open-redirect attacks.
 */
export function sanitizeReturnUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '/dashboard';
  // Must start with '/' and not '//' or 'http'
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }
  return '/dashboard';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('user');
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfileAndRole = useCallback(async (userId: string, userEmail: string, userMetadata?: Record<string, unknown>) => {
    if (!isSupabaseConfigured) {
      setProfile({
        id: userId,
        email: userEmail,
        display_name: 'Demo Footballer',
        full_name: 'Demo Footballer',
        avatar_url: null,
        preferred_position: 'MID',
      });
      setRole('admin');
      return;
    }

    try {
      // 1. Fetch profile with exact schema columns
      const { data: profData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, preferred_position, secondary_position')
        .eq('id', userId)
        .maybeSingle();

      if (profData) {
        setProfile({
          id: profData.id,
          email: userEmail,
          display_name: profData.display_name,
          full_name: profData.display_name,
          avatar_url: profData.avatar_url,
          preferred_position: profData.preferred_position,
          secondary_position: profData.secondary_position,
        });
      } else {
        // Missing-profile self-healing: Auto-create profile row
        const fallbackName = (userMetadata?.full_name as string) || (userMetadata?.name as string) || userEmail.split('@')[0] || 'Player';
        const fallbackAvatar = (userMetadata?.avatar_url as string) || null;

        const { data: createdProf } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            display_name: fallbackName,
            avatar_url: fallbackAvatar,
          })
          .select()
          .maybeSingle();

        setProfile({
          id: userId,
          email: userEmail,
          display_name: createdProf?.display_name || fallbackName,
          full_name: createdProf?.display_name || fallbackName,
          avatar_url: createdProf?.avatar_url || fallbackAvatar,
          preferred_position: createdProf?.preferred_position || null,
          secondary_position: createdProf?.secondary_position || null,
        });
      }

      // 2. Check admin status via safe check
      try {
        const { data: isAdmin } = await supabase.rpc('is_admin', { check_user_id: userId });
        setRole(isAdmin ? 'admin' : 'user');
      } catch {
        setRole('user');
      }
    } catch (err) {
      console.error('[Auth] Failed to fetch profile and role:', err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured) {
      const demoUser = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'player@kalikkanundo.com',
        user_metadata: { full_name: 'Kalikkanundo Captain' },
      } as unknown as User;

      setUser(demoUser);
      setProfile({
        id: demoUser.id,
        email: 'player@kalikkanundo.com',
        display_name: 'Kalikkanundo Captain',
        full_name: 'Kalikkanundo Captain',
        avatar_url: null,
        preferred_position: 'MID',
      });
      setRole('admin');
      setIsLoading(false);
      return;
    }

    // 1. Restore current session
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        if (!isMounted) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user) {
          fetchProfileAndRole(
            initialSession.user.id,
            initialSession.user.email ?? '',
            initialSession.user.user_metadata
          );
        }
      })
      .catch((err) => {
        console.error('[Auth] Error restoring session:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchProfileAndRole(
          newSession.user.id,
          newSession.user.email ?? '',
          newSession.user.user_metadata
        );
      } else {
        setProfile(null);
        setRole('user');
        queryClient.clear();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileAndRole, queryClient]);

  const signInWithGoogle = async (returnUrl?: string) => {
    if (!isSupabaseConfigured) {
      alert(
        'Supabase is not configured yet with live credentials in .env.\nPlease add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
      );
      return;
    }

    const safeUrl = sanitizeReturnUrl(returnUrl);
    const callbackUrl = `${window.location.origin}/auth/callback?returnUrl=${encodeURIComponent(
      safeUrl
    )}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet with live credentials in .env.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      await fetchProfileAndRole(data.user.id, data.user.email ?? '', data.user.user_metadata);
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet with live credentials in .env.');
    }
    const cleanEmail = email.trim();
    const cleanName = name.trim();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          display_name: cleanName,
        },
      },
    });

    if (error) {
      throw error;
    }

    // Auto-create or upsert profile row if user was created immediately
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        display_name: cleanName,
      });
    }

    const requiresVerification = !data.session;
    return { requiresVerification };
  };

  const signOut = async () => {
    queryClient.clear();
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole('user');
    window.location.href = '/login';
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndRole(user.id, user.email ?? '', user.user_metadata);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
