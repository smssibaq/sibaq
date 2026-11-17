import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';

export const squadImageKey = (squadId: string) => ['squad-image', squadId] as const;

/**
 * Squad logo URL. Read separately from the main squad queries so the app keeps working
 * (showing the default icon) before the squad image SQL has been applied.
 */
export function useSquadImage(squadId: string | undefined) {
  return useQuery({
    queryKey: squadImageKey(squadId ?? ''),
    enabled: Boolean(squadId),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.from('squads').select('image_url').eq('id', squadId!).maybeSingle();
      if (error) return null;
      return data?.image_url ?? null;
    },
  });
}
