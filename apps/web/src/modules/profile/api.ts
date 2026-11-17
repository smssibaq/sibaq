import { useQuery, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import type { Json } from '@/types/database.types';
import type { PlayerProfile, ProfileDraft, SportCatalogItem } from './types';

export const playerProfileKey = (userId: string) => ['player-profile', userId] as const;
export const catalogKey = ['sports-catalog'] as const;
export function profileErrorMessage(error: unknown): string {
  return error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to save your profile.';
}
export const profileApi = {
  async get(userId?: string): Promise<PlayerProfile | null> {
    const {data, error} = await supabase.rpc('get_player_profile', userId ? {p_user:userId} : {});
    if(error) throw error;
    return data as unknown as PlayerProfile | null;
  },
  async catalog(): Promise<SportCatalogItem[]> {
    const {data,error} = await supabase.rpc('list_sports_catalog', {});
    if(error) throw error;
    return (data ?? []) as unknown as SportCatalogItem[];
  },
  async save(draft: ProfileDraft): Promise<PlayerProfile> {
    const {data,error} = await supabase.rpc('save_my_profile', {
      p_display_name:draft.displayName.trim(), p_home_area:draft.homeArea.trim() || null,
      p_bio:draft.bio.trim() || null, p_avatar_url:draft.avatarUrl,
      p_sports:draft.sports as unknown as Json,
    });
    if(error) throw error;
    if(!data) throw new Error('The profile was not returned. Please try again.');
    return data as unknown as PlayerProfile;
  },
};
export function useSportsCatalog() {
  return useQuery({queryKey:catalogKey, queryFn:profileApi.catalog, staleTime:5*60*1000});
}
export function makeProfileDraft(profile: PlayerProfile | null, fallbackName = ''): ProfileDraft {
  return {
    displayName:profile?.display_name ?? fallbackName, homeArea:profile?.home_area ?? '',
    bio:profile?.bio ?? '', avatarUrl:profile?.avatar_url ?? null,
    sports:profile?.sports.map(s => ({sport:s.sport, skill_level:s.skill_level, roles:[...s.roles], is_primary:s.is_primary})) ?? [],
  };
}
export function validateAbout(draft: ProfileDraft): string | null {
  const name=draft.displayName.trim();
  if(name.length<2 || name.length>40) return 'Name must be 2-40 characters';
  if(draft.homeArea.trim().length>80) return 'Home area must be at most 80 characters';
  if(draft.bio.trim().length>160) return 'Bio must be at most 160 characters';
  return null;
}

export function refreshPlayerPhotos(client:QueryClient){
  return client.invalidateQueries({predicate:query=>['teams','team-players','matches','squads','badminton','cricket','volleyball'].includes(String(query.queryKey[0]))});
}
