import { supabase } from '@/infrastructure/supabase/client';
import type {
  BadmintonFormat,
  BadmintonRsvpStatus,
  BadmintonSide,
} from '@/types/sports/badminton.db';

export const badmintonKeys = {
  all: ['badminton'] as const,
  list: ['badminton', 'list'] as const,
  detail: (gameId: string) => ['badminton', 'detail', gameId] as const,
};

export interface BadmintonGameListItem {
  id: string;
  squadId: string | null;
  title: string;
  venue: string | null;
  startsAt: string;
  status: string;
  format: BadmintonFormat;
  capacity: number;
  court: string | null;
  confirmedCount: number;
}

export interface BadmintonPlayer {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  status: BadmintonRsvpStatus;
}

export interface BadmintonGameDetail {
  id: string;
  squadId: string | null;
  title: string;
  venue: string | null;
  startsAt: string;
  status: string;
  isOrganizer: boolean;
  isParticipant: boolean;
  confirmedCount: number;
  format: BadmintonFormat;
  capacity: number;
  court: string | null;
  skillLevel: string | null;
  resultScore: string | null;
  winnerSide: BadmintonSide | null;
  players: BadmintonPlayer[];
  pairs: { side: BadmintonSide; userId: string }[];
  myStatus: BadmintonRsvpStatus | null;
}

export const badmintonApi = {
  async listGames(): Promise<BadmintonGameListItem[]> {
    const { data: games, error } = await supabase
      .from('games')
      .select('id, squad_id, title, venue, starts_at, status')
      .eq('sport', 'badminton')
      .order('starts_at', { ascending: true });
    if (error) throw error;
    if (!games || games.length === 0) return [];

    const ids = games.map((g) => g.id);
    const [{ data: details, error: dErr }, { data: rsvps, error: rErr }] = await Promise.all([
      supabase.from('badminton_games').select('id, format, capacity, court').in('id', ids),
      supabase.from('badminton_rsvps').select('game_id, status').in('game_id', ids).eq('status', 'in'),
    ]);
    if (dErr) throw dErr;
    if (rErr) throw rErr;

    return games.map((g) => {
      const d = details?.find((x) => x.id === g.id);
      return {
        id: g.id,
        squadId: g.squad_id,
        title: g.title,
        venue: g.venue,
        startsAt: g.starts_at,
        status: g.status,
        format: d?.format ?? 'doubles',
        capacity: d?.capacity ?? 4,
        court: d?.court ?? null,
        confirmedCount: (rsvps ?? []).filter((r) => r.game_id === g.id).length,
      };
    });
  },

  async getGame(gameId: string, currentUserId: string | null): Promise<BadmintonGameDetail | null> {
    const { data: ctxRows, error: ctxErr } = await supabase.rpc('get_game_context', { p_game: gameId });
    if (ctxErr) throw ctxErr;
    const ctx = ctxRows?.[0];
    if (!ctx) return null;

    const [{ data: detail, error: dErr }, { data: rsvps, error: rErr }, { data: pairs, error: pErr }] =
      await Promise.all([
        supabase
          .from('badminton_games')
          .select('format, capacity, court, skill_level, result_score, winner_side')
          .eq('id', gameId)
          .maybeSingle(),
        supabase.from('badminton_rsvps').select('user_id, status, updated_at').eq('game_id', gameId),
        supabase.from('badminton_pairs').select('side, user_id').eq('game_id', gameId),
      ]);
    if (dErr) throw dErr;
    if (rErr) throw rErr;
    if (pErr) throw pErr;
    if (!detail) return null;

    const userIds = (rsvps ?? []).map((r) => r.user_id);
    const { data: profiles } = userIds.length
      ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds)
      : { data: [] as { id: string; display_name: string | null; avatar_url: string | null }[] };

    const players: BadmintonPlayer[] = (rsvps ?? [])
      .slice()
      .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
      .map((r) => {
        const p = profiles?.find((x) => x.id === r.user_id);
        return {
          userId: r.user_id,
          displayName: p?.display_name || 'Player',
          avatarUrl: p?.avatar_url ?? null,
          status: r.status,
        };
      });

    return {
      id: ctx.game_id,
      squadId: ctx.squad_id,
      title: ctx.title,
      venue: ctx.venue,
      startsAt: ctx.starts_at,
      status: ctx.status,
      isOrganizer: ctx.is_organizer,
      isParticipant: ctx.is_participant,
      confirmedCount: ctx.confirmed_count,
      format: detail.format,
      capacity: detail.capacity,
      court: detail.court,
      skillLevel: detail.skill_level,
      resultScore: detail.result_score,
      winnerSide: detail.winner_side,
      players,
      pairs: (pairs ?? []).map((p) => ({ side: p.side, userId: p.user_id })),
      myStatus: players.find((p) => p.userId === currentUserId)?.status ?? null,
    };
  },

  async createGame(params: {
    squadId: string;
    title: string;
    venue: string;
    startsAt: string;
    format: BadmintonFormat;
    court?: string;
    skillLevel?: string;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('badminton_create_game', {
      p_squad: params.squadId,
      p_title: params.title.trim(),
      p_venue: params.venue.trim() || null,
      p_starts_at: new Date(params.startsAt).toISOString(),
      p_format: params.format,
      p_court: params.court?.trim() || null,
      p_skill_level: params.skillLevel?.trim() || null,
    });
    if (error) throw error;
    return data;
  },

  async setRsvp(gameId: string, status: BadmintonRsvpStatus): Promise<void> {
    const { error } = await supabase.rpc('badminton_set_rsvp', { p_game: gameId, p_status: status });
    if (error) throw error;
  },

  async setPairs(gameId: string, sideA: string[], sideB: string[]): Promise<void> {
    const { error } = await supabase.rpc('badminton_set_pairs', {
      p_game: gameId,
      p_side_a: sideA,
      p_side_b: sideB,
    });
    if (error) throw error;
  },

  async recordResult(gameId: string, score: string, winner: BadmintonSide | null): Promise<void> {
    const { error } = await supabase.rpc('badminton_record_result', {
      p_game: gameId,
      p_score: score.trim() || null,
      p_winner_side: winner,
    });
    if (error) throw error;
  },
};
