import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import { queryKeys } from '@/infrastructure/query-keys';

interface UseSquadRealtimeOptions {
  squadId?: string;
  enabled?: boolean;
  onUpdate?: () => void;
}

/**
 * Reusable Supabase Realtime subscription hook scoped to a single squad.
 * Automatically refreshes squad details, roster memberships, and invites on remote changes.
 */
export function useSquadRealtime({ squadId, enabled = true, onUpdate }: UseSquadRealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !squadId) return;

    const channelName = `realtime:squad:${squadId}`;
    const channel = supabase.channel(channelName);

    channel
      // 1. Squad Details Update
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'squads',
          filter: `id=eq.${squadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.squads.detail(squadId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.squads.mySquads });
          onUpdate?.();
        }
      )
      // 2. Squad Members Update (Joins, Approvals, Role Changes, Removals)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'squad_members',
          filter: `squad_id=eq.${squadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.squads.members(squadId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.squads.detail(squadId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.squads.mySquads });
          onUpdate?.();
        }
      )
      // 3. Squad Invitations Update
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'squad_invitations',
          filter: `squad_id=eq.${squadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.squads.invites(squadId) });
          onUpdate?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [squadId, enabled, queryClient, onUpdate]);
}
