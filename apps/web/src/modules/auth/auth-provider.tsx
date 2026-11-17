import { ProfilePhotoContext } from '@/lib/images/profile-photo-context';
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import type { UserRole } from '../../types/database.types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../infrastructure/query-keys';
import { playerProfileKey, profileApi } from '@/modules/profile/api';
import type { PlayerProfile } from '@/modules/profile/types';

export interface UserProfile extends PlayerProfile {
  email?: string; full_name?: string | null;
  preferred_position?: string | null; secondary_position?: string | null;
}
export interface AuthContextValue {
  user: User | null; session: Session | null; profile: UserProfile | null;
  role: UserRole; isLoading: boolean; isConfigured: boolean; needsOnboarding: boolean;
  profileError: unknown;
  signInWithGoogle: (returnUrl?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{requiresVerification:boolean}>;
  signOut: () => Promise<void>; refreshProfile: () => Promise<void>;
}
const AuthContext=createContext<AuthContextValue | null>(null);

/** Only same-origin relative paths may be used after authentication. */
export function sanitizeReturnUrl(url?: string | null): string {
  if(!url || !url.startsWith('/') || url.startsWith('//') || url.includes('\\') || [...url].some(char => char.charCodeAt(0) <= 32))return '/dashboard';
  try {
    const parsed=new URL(url,'https://kalikkanundo.invalid');
    if(parsed.origin!=='https://kalikkanundo.invalid' || parsed.pathname.startsWith('//'))return '/dashboard';
    return parsed.pathname+parsed.search+parsed.hash;
  }catch{return '/dashboard';}
}

export function AuthProvider({children}:{children:React.ReactNode}) {
  const queryClient=useQueryClient();
  const [session,setSession]=useState<Session | null>(null);
  const [user,setUser]=useState<User | null>(null);
  const [authLoading,setAuthLoading]=useState(true);
  const lastUserId=useRef<string | null>(null);
  const profileQuery=useQuery({
    queryKey:playerProfileKey(user?.id ?? ''), enabled:Boolean(user) && isSupabaseConfigured,
    queryFn:async():Promise<UserProfile>=>{
      const [profile,legacy]=await Promise.all([
        profileApi.get(),
        supabase.from('profiles').select('preferred_position, secondary_position').eq('id',user!.id).maybeSingle(),
      ]);
      if(legacy.error)throw legacy.error;
      return {
        ...(profile ?? {id:user!.id,display_name:null,avatar_url:null,home_area:null,bio:null,is_me:true,onboarding_completed:false,sports:[],my_rating:null}),
        email:user?.email,full_name:profile?.display_name,
        preferred_position:legacy.data?.preferred_position ?? null,
        secondary_position:legacy.data?.secondary_position ?? null,
      };
    },
  });
  const roleQuery=useQuery({
    queryKey:['auth-role',user?.id],enabled:Boolean(user) && isSupabaseConfigured,
    queryFn:async()=>{
      const {data,error}=await supabase.rpc('is_admin',{check_user_id:user!.id});
      if(error)throw error;return data?'admin' as const:'user' as const;
    },
  });
  useEffect(()=>{
    let active=true,authEventReceived=false;
    if(!isSupabaseConfigured){
      setUser({id:'00000000-0000-0000-0000-000000000001',email:'player@kalikkanundo.com',user_metadata:{}} as User);
      setAuthLoading(false);return;
    }
    function update(next:Session | null){
      if(!active)return;
      const nextId=next?.user.id ?? null;
      if(lastUserId.current && lastUserId.current!==nextId)queryClient.clear();
      lastUserId.current=nextId;
      setSession(next);setUser(next?.user ?? null);setAuthLoading(false);
    }
    // Keep the auth callback synchronous: queries run after session state updates.
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{
      authEventReceived=true;update(next);
    });
    void supabase.auth.getSession().then(({data,error})=>{
      if(error)throw error;
      if(!authEventReceived)update(data.session);
    }).catch(error=>{console.error('[Auth] Session restore failed',error);if(active)setAuthLoading(false);});
    return ()=>{active=false;subscription.unsubscribe();};
  },[queryClient]);
  const profile:UserProfile | null=isSupabaseConfigured?profileQuery.data ?? null:user?{
    id:user.id,display_name:'Kalikkanundo Captain',avatar_url:null,home_area:null,bio:null,
    is_me:true,onboarding_completed:true,sports:[],my_rating:null,
  }:null;
  const role:UserRole=isSupabaseConfigured?roleQuery.data ?? 'user':'admin';
  const isLoading=authLoading || Boolean(user && isSupabaseConfigured && (profileQuery.isPending || roleQuery.isPending));
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
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      throw error;
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

    const requiresVerification = !data.session;
    return { requiresVerification };
  };


  const signOut=async()=>{
    queryClient.clear();
    if(isSupabaseConfigured)await supabase.auth.signOut();
    setSession(null);setUser(null);window.location.href='/login';
  };
  const refreshProfile=async()=>{
    if(!user || !isSupabaseConfigured)return;
    await queryClient.invalidateQueries({queryKey:playerProfileKey(user.id),refetchType:'none'});
    const result=await profileQuery.refetch();
    if(result.error)throw result.error;
    await queryClient.invalidateQueries({queryKey:queryKeys.profile.me});
  };
  return <AuthContext.Provider value={{
    user,session,profile,role,isLoading,isConfigured:isSupabaseConfigured,needsOnboarding:!profile?.onboarding_completed,
    profileError:profileQuery.error,signInWithGoogle,signInWithEmail,signUpWithEmail,signOut,refreshProfile,
  }}><ProfilePhotoContext.Provider value={{userId:user?.id ?? null,url:profile?.avatar_url ?? null}}>{children}</ProfilePhotoContext.Provider></AuthContext.Provider>;
}
export function useAuth(){
  const context=useContext(AuthContext);if(!context)throw new Error('useAuth must be used within an AuthProvider');return context;
}
