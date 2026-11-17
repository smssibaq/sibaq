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
  pairs: { side: BadmintonSide; userId: string; position?: number | null; coordinate?: { x: number; y: number } | null }[];
  myStatus: BadmintonRsvpStatus | null;
  bench: string[];
  lineupStorageReady: boolean;
}

export const badmintonApi = {
  async updateGame(gameId: string, title: string, venue: string, startsAt: string): Promise<void> {
    if (!title.trim() || !Number.isFinite(new Date(startsAt).getTime())) throw new Error('Enter a title and valid start time.');
    const { error } = await supabase.rpc('badminton_update_game', { p_game: gameId, p_title: title.trim(), p_venue: venue.trim(), p_starts_at: new Date(startsAt).toISOString() });
    if (error) throw error;
  },
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

    const { data: benchRows, error: benchError } = await supabase.from('badminton_bench').select('user_id').eq('game_id', gameId);
    if (benchError && !['PGRST205', '42P01'].includes(benchError.code)) throw benchError;
    let orderedPairs: { side: BadmintonSide; user_id: string; position_index?: number | null; court_x?: number | null; court_y?: number | null }[] | null = pairs;
    if (!benchError) {
      const { data, error } = await supabase.from('badminton_pairs').select('side, user_id, position_index').eq('game_id', gameId).order('position_index', { nullsFirst: false }).order('created_at').order('user_id');
      if (error) throw error;
      orderedPairs = data;
    }
    if (!benchError) {
      const { data, error } = await supabase.from('badminton_pairs').select('side,user_id,position_index,court_x,court_y').eq('game_id', gameId).order('position_index', { nullsFirst: false });
      if (error && !['42703', 'PGRST204'].includes(error.code)) throw error;
      if (!error) orderedPairs = data;
    }
    const userIds = (rsvps ?? []).map((r) => r.user_id);
    const { data: profiles, error: profileError } = userIds.length
      ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds)
      : { data: [] as { id: string; display_name: string | null; avatar_url: string | null }[], error: null };
    if (profileError) throw profileError;

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
      bench: (benchRows ?? []).map(p => p.user_id),
      lineupStorageReady: !benchError,
      pairs: (orderedPairs ?? []).map((p) => ({ side: p.side, userId: p.user_id, position: p.position_index ?? null, coordinate: p.court_x != null && p.court_y != null ? { x: p.court_x, y: p.court_y } : null })),
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
    if (new Set([...sideA, ...sideB]).size !== sideA.length + sideB.length) throw new Error('A player can only be assigned once.');
    const [{ data: game, error: gameError }, { data: attendance, error: attendanceError }] = await Promise.all([
      supabase.from('badminton_games').select('format').eq('id', gameId).single(),
      supabase.from('badminton_rsvps').select('user_id').eq('game_id', gameId).eq('status', 'in'),
    ]);
    if (gameError) throw gameError;
    if (attendanceError) throw attendanceError;
    const max = game.format === 'singles' ? 1 : 2;
    if (sideA.length > max || sideB.length > max) throw new Error('Too many players on a side.');
    if ([...sideA, ...sideB].some(id => !attendance.some(p => p.user_id === id))) throw new Error('Attendance changed. Only confirmed players can be assigned.');
    const { error } = await supabase.rpc('badminton_set_pairs', {
      p_game: gameId,
      p_side_a: sideA,
      p_side_b: sideB,
    });
    if (error) throw error;
  },

  async saveLineup(gameId: string, sideA: (string | null)[], sideB: (string | null)[], bench: string[], positions?: Record<string, { x: number; y: number }>): Promise<void> {
    const assigned = [...sideA, ...sideB, ...bench].filter(id => id !== null);
    if (new Set(assigned).size !== assigned.length) throw new Error('A player can only have one assignment.');
    const { error } = positions ? await supabase.rpc('badminton_save_positioned_lineup', { p_game: gameId, p_side_a: sideA, p_side_b: sideB, p_bench: bench, p_positions: positions }) : await supabase.rpc('badminton_save_lineup', { p_game: gameId, p_side_a: sideA, p_side_b: sideB, p_bench: bench });
    if (error?.code === 'PGRST202') throw new Error('Run the badminton_court_positions SQL migration to save draggable positions.');
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
