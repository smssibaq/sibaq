import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import { useToast } from '@/components/ui';
import { normalizeError } from '@/lib/errors';
import { volleyballApi, volleyballKeys } from './api';
import type { VolleyballAttendance, VolleyballTeamSide } from '@/types/sports/volleyball.db';

export function useVolleyballGames() {
  const queryClient = useQueryClient();

  // Realtime: RLS limits events to games the user belongs to, so no filter is needed.
  useEffect(() => {
    const channel = supabase
      .channel('realtime:volleyball:list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'volleyball_game_players' }, () => {
        queryClient.invalidateQueries({ queryKey: volleyballKeys.list });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: 'sport=eq.volleyball' }, () => {
        queryClient.invalidateQueries({ queryKey: volleyballKeys.list });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({ queryKey: volleyballKeys.list, queryFn: volleyballApi.listMyGames });
}

export function useVolleyballGame(gameId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!gameId) return;
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: volleyballKeys.detail(gameId) });
      queryClient.invalidateQueries({ queryKey: volleyballKeys.list });
    };
    const channel = supabase
      .channel(`realtime:volleyball:${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'volleyball_game_players', filter: `game_id=eq.${gameId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'volleyball_team_players', filter: `game_id=eq.${gameId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, queryClient]);

  return useQuery({
    queryKey: volleyballKeys.detail(gameId ?? ''),
    queryFn: () => volleyballApi.getGame(gameId as string),
    enabled: Boolean(gameId),
  });
}

/** Shared mutation plumbing: error toast + cache refresh. */
function useGameMutation<TVars>(gameId: string, fn: (vars: TVars) => Promise<unknown>, successMessage?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      if (successMessage) toast.success(successMessage);
    },
    onError: (err) => toast.error('Action failed', normalizeError(err).message),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: volleyballKeys.detail(gameId) });
      queryClient.invalidateQueries({ queryKey: volleyballKeys.list });
    },
  });
}

export function useSetAttendance(gameId: string) {
  return useGameMutation<VolleyballAttendance>(gameId, (status) => volleyballApi.setAttendance(gameId, status));
}

export function useSetTeam(gameId: string) {
  return useGameMutation<{ userId: string; side: VolleyballTeamSide | null }>(gameId, ({ userId, side }) =>
    volleyballApi.setTeam(gameId, userId, side)
  );
}

export function useAutoBalance(gameId: string) {
  return useGameMutation<void>(gameId, () => volleyballApi.autoBalance(gameId), 'Teams balanced');
}

export function useSetGameStatus(gameId: string) {
  return useGameMutation<'scheduled' | 'completed' | 'cancelled'>(gameId, (status) =>
    volleyballApi.setStatus(gameId, status)
  , 'Game updated');
}
