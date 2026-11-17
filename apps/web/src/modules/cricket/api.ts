import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '@/infrastructure/supabase/client';
import { useToast } from '@/components/ui';
import { normalizeError } from '@/lib/errors';
import type {
  CricketAttendance,
  CricketFieldPosition,
  CricketGameDetail,
  CricketGameSummary,
  CricketSide,
  CricketStatus,
  CreateCricketGameInput,
} from './types';
import { cricketPaths } from './utils';

// ---------------------------------------------------------------------------
// Raw RPC plumbing
// ---------------------------------------------------------------------------

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

// The shared Database type doesn't know about cricket_* RPCs, so call through a thin untyped wrapper.
async function callRpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await (supabase as unknown as RpcClient).rpc(fn, args);
  if (error) throw error;
  return data as T;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const cricketKeys = {
  all: ['cricket'] as const,
  list: ['cricket', 'games'] as const,
  detail: (gameId: string) => ['cricket', 'game', gameId] as const,
};

// ---------------------------------------------------------------------------
// Raw API
// ---------------------------------------------------------------------------

export const cricketApi = {
  getLineupLayout: (gameId: string) => callRpc<import('@/components/lineup/sport-lineup-board').LayoutRow[]>('cricket_get_lineup_layout', { p_game: gameId }),
  saveLineupLayout: (gameId: string, rows: import('@/components/lineup/sport-lineup-board').LayoutRow[]) => callRpc<void>('cricket_save_lineup_layout', { p_game: gameId, p_rows: rows }),
  listMyGames: () => callRpc<CricketGameSummary[]>('cricket_list_my_games'),

  getGame: (gameId: string) =>
    callRpc<CricketGameDetail>('cricket_get_game', { p_game: gameId }),

  createGame: (input: CreateCricketGameInput) =>
    callRpc<string>('cricket_create_game', {
      p_title: input.title,
      p_venue: input.venue,
      p_starts_at: input.startsAt,
      p_players_per_side: input.playersPerSide,
      p_overs: input.oversPerInnings,
      p_notes: input.notes?.trim() ? input.notes.trim() : null,
    }),

  joinByCode: (code: string) =>
    callRpc<string>('cricket_join_by_code', { p_code: code }),

  setAttendance: (gameId: string, status: CricketAttendance) =>
    callRpc<void>('cricket_set_attendance', { p_game: gameId, p_status: status }),

  setTeam: (gameId: string, userId: string, side: CricketSide | null) =>
    callRpc<void>('cricket_set_team', { p_game: gameId, p_user: userId, p_side: side }),

  autoBalance: (gameId: string) =>
    callRpc<void>('cricket_auto_balance', { p_game: gameId }),

  setCaptain: (gameId: string, userId: string, side: CricketSide) =>
    callRpc<void>('cricket_set_captain', { p_game: gameId, p_user: userId, p_side: side }),

  setWicketkeeper: (gameId: string, userId: string, side: CricketSide) =>
    callRpc<void>('cricket_set_wicketkeeper', { p_game: gameId, p_user: userId, p_side: side }),

  setBattingOrder: (
    gameId: string,
    side: CricketSide,
    assignments: Array<{ player_id: string; batting_position: number }>
  ) =>
    callRpc<void>('cricket_set_batting_order', {
      p_game: gameId,
      p_side: side,
      p_assignments: assignments,
    }),

  setFieldPositions: (
    gameId: string,
    side: CricketSide,
    positions: Array<{
      player_id: string;
      position_name: string;
      x_pos: number;
      y_pos: number;
      is_custom: boolean;
    }>
  ) =>
    callRpc<void>('cricket_set_field_positions', {
      p_game: gameId,
      p_side: side,
      p_positions: positions,
    }),

  recordToss: (gameId: string, winning_team: CricketSide, decision: 'bat' | 'bowl') =>
    callRpc<void>('cricket_record_toss', {
      p_game: gameId,
      p_winning_team: winning_team,
      p_decision: decision,
    }),

  setStatus: (gameId: string, status: CricketStatus) =>
    callRpc<void>('cricket_set_status', { p_game: gameId, p_status: status }),
};

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

export function useCricketGames() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('realtime:cricket:list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cricket_game_players' },
        () => {
          queryClient.invalidateQueries({ queryKey: cricketKeys.list });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: 'sport=eq.cricket' },
        () => {
          queryClient.invalidateQueries({ queryKey: cricketKeys.list });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({ queryKey: cricketKeys.list, queryFn: cricketApi.listMyGames });
}

export function useCricketGame(gameId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!gameId) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: cricketKeys.detail(gameId) });
      queryClient.invalidateQueries({ queryKey: cricketKeys.list });
    };

    const channel = supabase
      .channel(`realtime:cricket:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cricket_game_players',
          filter: `game_id=eq.${gameId}`,
        },
        invalidate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cricket_team_players',
          filter: `game_id=eq.${gameId}`,
        },
        invalidate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cricket_batting_order',
          filter: `game_id=eq.${gameId}`,
        },
        invalidate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cricket_field_positions',
          filter: `game_id=eq.${gameId}`,
        },
        invalidate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, queryClient]);

  return useQuery({
    queryKey: cricketKeys.detail(gameId ?? ''),
    queryFn: () => cricketApi.getGame(gameId as string),
    enabled: Boolean(gameId),
  });
}

// ---------------------------------------------------------------------------
// Mutation plumbing
// ---------------------------------------------------------------------------

/** Shared mutation helper: error toast + cache invalidation. */
function useGameMutation<TVars>(
  gameId: string,
  fn: (vars: TVars) => Promise<unknown>,
  successMessage?: string
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      if (successMessage) toast.success(successMessage);
    },
    onError: (err) => toast.error('Action failed', normalizeError(err).message),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cricketKeys.detail(gameId) });
      queryClient.invalidateQueries({ queryKey: cricketKeys.list });
    },
  });
}

// ---------------------------------------------------------------------------
// Individual exported mutation hooks
// ---------------------------------------------------------------------------

export function useSetAttendance(gameId: string) {
  return useGameMutation<CricketAttendance>(gameId, (status) =>
    cricketApi.setAttendance(gameId, status)
  );
}

export function useSetTeam(gameId: string) {
  return useGameMutation<{ userId: string; side: CricketSide | null }>(
    gameId,
    ({ userId, side }) => cricketApi.setTeam(gameId, userId, side)
  );
}

export function useAutoBalance(gameId: string) {
  return useGameMutation<void>(gameId, () => cricketApi.autoBalance(gameId), 'Teams balanced');
}

export function useSetCaptain(gameId: string) {
  return useGameMutation<{ userId: string; side: CricketSide }>(gameId, ({ userId, side }) =>
    cricketApi.setCaptain(gameId, userId, side)
  );
}

export function useSetWicketkeeper(gameId: string) {
  return useGameMutation<{ userId: string; side: CricketSide }>(gameId, ({ userId, side }) =>
    cricketApi.setWicketkeeper(gameId, userId, side)
  );
}

export function useSetBattingOrder(gameId: string) {
  return useGameMutation<{ side: CricketSide; assignments: Array<{ player_id: string; batting_position: number }> }>(
    gameId,
    ({ side, assignments }) => cricketApi.setBattingOrder(gameId, side, assignments)
  );
}

export function useSetFieldPositions(gameId: string) {
  return useGameMutation<{ side: CricketSide; positions: CricketFieldPosition[] }>(
    gameId,
    ({ side, positions }) => cricketApi.setFieldPositions(gameId, side, positions)
  );
}

export function useRecordToss(gameId: string) {
  return useGameMutation<{ winning_team: CricketSide; decision: 'bat' | 'bowl' }>(
    gameId,
    ({ winning_team, decision }) => cricketApi.recordToss(gameId, winning_team, decision),
    'Toss recorded'
  );
}

export function useSetStatus(gameId: string) {
  return useGameMutation<CricketStatus>(
    gameId,
    (status) => cricketApi.setStatus(gameId, status),
    'Game updated'
  );
}

export function useCreateGame() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: cricketApi.createGame,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cricketKeys.list });
    },
    onError: (err) => toast.error('Failed to create game', normalizeError(err).message),
  });
}

export function useJoinByCode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: cricketApi.joinByCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cricketKeys.list });
    },
    onError: (err) => toast.error('Failed to join game', normalizeError(err).message),
  });
}

// ---------------------------------------------------------------------------
// Aggregate mutations hook
// ---------------------------------------------------------------------------

export function useCricketMutations(gameId?: string) {
  const id = gameId ?? '';
  return {
    createGame: useCreateGame(),
    joinByCode: useJoinByCode(),
    setAttendance: useSetAttendance(id),
    setTeam: useSetTeam(id),
    autoBalance: useAutoBalance(id),
    setCaptain: useSetCaptain(id),
    setWicketkeeper: useSetWicketkeeper(id),
    setBattingOrder: useSetBattingOrder(id),
    setFieldPositions: useSetFieldPositions(id),
    recordToss: useRecordToss(id),
    setStatus: useSetStatus(id),
  };
}

// ---------------------------------------------------------------------------
// Navigation helper
// ---------------------------------------------------------------------------

export function cricketNav() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const navigate = useNavigate();
  return {
    toHub: () => navigate({ to: cricketPaths.hub }),
    toCreate: () => navigate({ to: cricketPaths.create }),
    toJoin: (code?: string) => navigate({ to: cricketPaths.join(code) }),
    toGame: (id: string) => navigate({ to: cricketPaths.game(id) }),
  };
}
