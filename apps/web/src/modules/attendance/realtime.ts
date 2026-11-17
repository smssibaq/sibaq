import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import { queryKeys } from '@/infrastructure/query-keys';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UseAttendanceRealtimeOptions {
  matchId: string;
  enabled?: boolean;
  onUpdate?: () => void;
}

/**
 * Subscribes to Supabase Postgres Changes for match attendance, match record, teams, and waitlist.
 * Handles lifecycle cleanup, reconnects with cache invalidation recovery, and targeted TanStack query invalidations.
 * Never trusts payloads for authorization - always triggers re-fetch of authenticated queries.
 */
export function useAttendanceRealtime({
  matchId,
  enabled = true,
  onUpdate,
}: UseAttendanceRealtimeOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const hasSubscribedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !matchId) return;

    const channelName = `realtime:match-attendance:${matchId}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      // 1. Attendance changes (insert, update, delete)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_attendance',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.matches.attendance(matchId),
          });
          queryClient.invalidateQueries({
            queryKey: ['matches', matchId, 'my-attendance'],
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.matches.detail(matchId),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.matches.all,
          });
          onUpdate?.();
        }
      )
      // 2. Waitlist changes (joins, leaves, automatic promotions)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_waitlist',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['matches', matchId, 'waitlist'],
          });
          queryClient.invalidateQueries({
            queryKey: ['matches', matchId, 'my-waitlist-position'],
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.matches.attendance(matchId),
          });
          queryClient.invalidateQueries({
            queryKey: ['matches', matchId, 'my-attendance'],
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.matches.detail(matchId),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.matches.all,
          });
          onUpdate?.();
        }
      )
      // 3. Match changes (status changes, timing updates, RSVP deadline)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.matches.detail(matchId),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.matches.all,
          });
          onUpdate?.();
        }
      )
      // 4. Teams updates (tactical edits, team formation sync from Developer B)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.matches.detail(matchId),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.teams.byMatch(matchId),
          });
          onUpdate?.();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // If this is a re-connection, invalidate queries to recover from missed events
          if (hasSubscribedRef.current) {
            queryClient.invalidateQueries({ queryKey: queryKeys.matches.detail(matchId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.matches.attendance(matchId) });
            queryClient.invalidateQueries({ queryKey: ['matches', matchId, 'waitlist'] });
            queryClient.invalidateQueries({ queryKey: ['matches', matchId, 'my-attendance'] });
            queryClient.invalidateQueries({ queryKey: ['matches', matchId, 'my-waitlist-position'] });
            onUpdate?.();
          }
          hasSubscribedRef.current = true;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn(`[Realtime Attendance] Subscription status: ${status}`, err);
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [matchId, enabled, queryClient, onUpdate]);
}
