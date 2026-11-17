import { supabase } from '@/infrastructure/supabase/client';
import type {
  CreateVolleyballGameInput,
  VolleyballAttendance,
  VolleyballGameDetail,
  VolleyballGameSummary,
  VolleyballInvitePreview,
  VolleyballTeamSide,
} from '@/types/sports/volleyball.db';

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

// The shared Database type doesn't know about volleyball_* RPCs (Dev A owns it), so call through a thin untyped wrapper.
async function callRpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await (supabase as unknown as RpcClient).rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export const volleyballKeys = {
  all: ['volleyball'] as const,
  list: ['volleyball', 'games'] as const,
  detail: (gameId: string) => ['volleyball', 'game', gameId] as const,
  preview: (code: string) => ['volleyball', 'preview', code] as const,
};

export const volleyballApi = {
  getLineupLayout: (gameId: string) => callRpc<import('@/components/lineup/sport-lineup-board').LayoutRow[]>('volleyball_get_lineup_layout', { p_game: gameId }),
  saveLineupLayout: (gameId: string, rows: import('@/components/lineup/sport-lineup-board').LayoutRow[]) => callRpc<void>('volleyball_save_lineup_layout', { p_game: gameId, p_rows: rows }),
  listMyGames: () => callRpc<VolleyballGameSummary[]>('volleyball_list_my_games'),

  getGame: (gameId: string) => callRpc<VolleyballGameDetail>('volleyball_get_game', { p_game: gameId }),

  createGame: (input: CreateVolleyballGameInput) =>
    callRpc<string>('volleyball_create_game', {
      p_title: input.title,
      p_venue: input.venue,
      p_starts_at: input.startsAt,
      p_players_per_side: input.playersPerSide,
      p_notes: input.notes?.trim() ? input.notes.trim() : null,
    }),

  previewByCode: async (code: string) => {
    const rows = await callRpc<VolleyballInvitePreview[]>('volleyball_preview_by_code', { p_code: code });
    return rows[0] ?? null;
  },

  joinByCode: (code: string) => callRpc<string>('volleyball_join_by_code', { p_code: code }),

  setAttendance: (gameId: string, status: VolleyballAttendance) =>
    callRpc<void>('volleyball_set_attendance', { p_game: gameId, p_status: status }),

  setTeam: (gameId: string, userId: string, side: VolleyballTeamSide | null) =>
    callRpc<void>('volleyball_set_team', { p_game: gameId, p_user: userId, p_side: side }),

  autoBalance: (gameId: string) => callRpc<void>('volleyball_auto_balance', { p_game: gameId }),

  setStatus: (gameId: string, status: 'scheduled' | 'completed' | 'cancelled') =>
    callRpc<void>('volleyball_set_status', { p_game: gameId, p_status: status }),
};
