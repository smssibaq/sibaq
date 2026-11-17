import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from './client';
import { queryKeys } from '../query-keys';

interface UseMatchRealtimeOptions {
  matchId?: string;
  enabled?: boolean;
  onUpdate?: (payload: { table: string; eventType: string; new: unknown; old: unknown }) => void;
}

/**
 * Reusable Supabase Realtime subscription hook scoped to a single match.
 * Automatically invalidates relevant TanStack Query caches on table mutations.
 * Cleans up channels on unmount.
 */
export function useMatchRealtime({ matchId, enabled = true, onUpdate }: UseMatchRealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !matchId) return;

    const channelName = `realtime:match:${matchId}`;
    const channel = supabase.channel(channelName);

    channel
      // 1. Matches update
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: queryKeys.matches.detail(matchId) });
          onUpdate?.({ table: 'matches', eventType: payload.eventType, new: payload.new, old: payload.old });
        }
      )
      // 2. Attendance update
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_attendance',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: queryKeys.matches.attendance(matchId) });
          onUpdate?.({ table: 'match_attendance', eventType: payload.eventType, new: payload.new, old: payload.old });
        }
      )
      // 3. Teams update
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: queryKeys.teams.byMatch(matchId) });
          onUpdate?.({ table: 'teams', eventType: payload.eventType, new: payload.new, old: payload.old });
        }
      )
      // 4. Team Players update
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_players',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: queryKeys.teams.byMatch(matchId) });
          onUpdate?.({ table: 'team_players', eventType: payload.eventType, new: payload.new, old: payload.old });
        }
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          // Connected successfully
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime Error] Channel ${channelName} encountered error:`, error);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, enabled, queryClient, onUpdate]);
}
