import { createWithLocation, updateWithLocation, type GameLocation } from '@/components/location/location-service';
import { supabase } from '@/infrastructure/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/infrastructure/query-keys';
import type { Match, MatchMode, MatchStatus, MatchDetail } from './types';

export interface ExtendedMatchService {
  createMatch(params: {
    squadId: string;
    title: string;
    mode: MatchMode;
    turfName: string;
    startsAt: string;
    playersPerTeam: number;
    locationDescription?: string;
    location?: GameLocation;
    rsvpDeadline?: string | null;
  }): Promise<string>;
  getMatch(matchId: string): Promise<MatchDetail | null>;
  listSquadMatches(squadId: string): Promise<Match[]>;
  listUserMatches(): Promise<Match[]>;
  updateMatch(
    matchId: string,
    updates: {
      location?: GameLocation;
      title?: string;
      turfName?: string;
      startsAt?: string;
      status?: MatchStatus;
      rsvpDeadline?: string | null;
    }
  ): Promise<void>;
  cancelMatch(matchId: string): Promise<void>;
}

export const matchApi: ExtendedMatchService = {
  // 1. Create match via verified RPC
  async createMatch(params: {
    squadId: string;
    title: string;
    mode: MatchMode;
    turfName: string;
    startsAt: string;
    playersPerTeam: number;
    locationDescription?: string;
    location?: GameLocation;
    rsvpDeadline?: string | null;
  }): Promise<string> {
    const finalTurf = params.locationDescription?.trim()
      ? `${params.turfName.trim()} (${params.locationDescription.trim()})`
      : params.turfName.trim();

    const utcStartsAt = new Date(params.startsAt).toISOString();
    const utcRsvpDeadline = params.rsvpDeadline ? new Date(params.rsvpDeadline).toISOString() : null;

    const data = await createWithLocation('football', {
      p_squad: params.squadId,
      p_title: params.title.trim(),
      p_mode: params.mode,
      p_turf_name: finalTurf,
      p_starts_at: utcStartsAt,
      p_players_per_team: params.playersPerTeam,
      p_rsvp_deadline: utcRsvpDeadline,
    }, params.location);
    return data;
  },

  // 2. Get match details with attendance counts, waitlist count, and teams
  async getMatch(matchId: string): Promise<MatchDetail | null> {
    const { data, error } = await supabase
      .from('matches')
      .select('id, squad_id, title, mode, turf_name, starts_at, players_per_team, rsvp_deadline, status, created_by, created_at')
      .eq('id', matchId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Fetch squad name
    const { data: squad } = await supabase
      .from('squads')
      .select('name')
      .eq('id', data.squad_id)
      .maybeSingle();

    // Fetch attendance breakdown
    const { data: attData } = await supabase
      .from('match_attendance')
      .select('status')
      .eq('match_id', matchId);

    const counts = {
      playing: (attData || []).filter((a) => a.status === 'playing').length,
      maybe: (attData || []).filter((a) => a.status === 'maybe').length,
      notPlaying: (attData || []).filter((a) => a.status === 'not_playing').length,
    };

    // Fetch waitlist count
    const { count: waitlistCount } = await supabase
      .from('match_waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', matchId);

    // Fetch match teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, match_id, name, side, color, formation, revision')
      .eq('match_id', matchId);

    const maxCapacity = data.mode === 'friendly' ? data.players_per_team * 2 : data.players_per_team;
    const cutoff = data.rsvp_deadline || data.starts_at;
    const isRsvpClosed = Boolean(
      data.status === 'cancelled' ||
      data.status === 'completed' ||
      (cutoff && new Date(cutoff).getTime() <= Date.now())
    );

    return {
      id: data.id,
      squadId: data.squad_id,
      title: data.title,
      mode: data.mode as MatchMode,
      turfName: data.turf_name,
      startsAt: data.starts_at,
      playersPerTeam: data.players_per_team,
      rsvpDeadline: data.rsvp_deadline,
      status: data.status as MatchStatus,
      createdBy: data.created_by,
      createdAt: data.created_at,
      squadName: squad?.name,
      attendanceCount: counts,
      waitlistCount: waitlistCount ?? 0,
      isRsvpClosed,
      maxCapacity,
      teams: (teamsData || []).map((t) => ({
        id: t.id,
        matchId: t.match_id,
        name: t.name,
        side: t.side,
        color: t.color,
        formation: t.formation,
        revision: t.revision,
      })),
    };
  },

  // 3. List matches for a squad
  async listSquadMatches(squadId: string): Promise<Match[]> {
    const { data, error } = await supabase
      .from('matches')
      .select('id, squad_id, title, mode, turf_name, starts_at, players_per_team, status, created_by, created_at')
      .eq('squad_id', squadId)
      .order('starts_at', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const matchIds = data.map((d) => d.id);
    const { data: attData } = await supabase
      .from('match_attendance')
      .select('match_id, status')
      .in('match_id', matchIds);

    const { data: squad } = await supabase
      .from('squads')
      .select('name')
      .eq('id', squadId)
      .maybeSingle();

    return data.map((d) => {
      const matchAtt = (attData || []).filter((a) => a.match_id === d.id);
      return {
        id: d.id,
        squadId: d.squad_id,
        title: d.title,
        mode: d.mode as MatchMode,
        turfName: d.turf_name,
        startsAt: d.starts_at,
        playersPerTeam: d.players_per_team,
        status: d.status as MatchStatus,
        createdBy: d.created_by,
        createdAt: d.created_at,
        squadName: squad?.name,
        attendanceCount: {
          playing: matchAtt.filter((a) => a.status === 'playing').length,
          maybe: matchAtt.filter((a) => a.status === 'maybe').length,
          notPlaying: matchAtt.filter((a) => a.status === 'not_playing').length,
        },
      };
    });
  },

  // 4. List matches across all squads current user belongs to
  async listUserMatches(): Promise<Match[]> {
    const { data: memberRows, error: memberError } = await supabase
      .from('squad_members')
      .select('squad_id, status')
      .eq('status', 'active');

    if (memberError) throw memberError;
    if (!memberRows || memberRows.length === 0) return [];

    const squadIds = memberRows.map((m) => m.squad_id);

    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('id, squad_id, title, mode, turf_name, starts_at, players_per_team, status, created_by, created_at')
      .in('squad_id', squadIds)
      .order('starts_at', { ascending: true });

    if (matchesError) throw matchesError;
    if (!matchesData || matchesData.length === 0) return [];

    const { data: squads } = await supabase
      .from('squads')
      .select('id, name')
      .in('id', squadIds);

    const matchIds = matchesData.map((d) => d.id);
    const { data: attData } = await supabase
      .from('match_attendance')
      .select('match_id, status')
      .in('match_id', matchIds);

    return matchesData.map((d) => {
      const sq = squads?.find((s) => s.id === d.squad_id);
      const matchAtt = (attData || []).filter((a) => a.match_id === d.id);
      return {
        id: d.id,
        squadId: d.squad_id,
        title: d.title,
        mode: d.mode as MatchMode,
        turfName: d.turf_name,
        startsAt: d.starts_at,
        playersPerTeam: d.players_per_team,
        status: d.status as MatchStatus,
        createdBy: d.created_by,
        createdAt: d.created_at,
        squadName: sq?.name,
        attendanceCount: {
          playing: matchAtt.filter((a) => a.status === 'playing').length,
          maybe: matchAtt.filter((a) => a.status === 'maybe').length,
          notPlaying: matchAtt.filter((a) => a.status === 'not_playing').length,
        },
      };
    });
  },

  // 5. Update match via verified RPC
  async updateMatch(
    matchId: string,
    updates: {
      location?: GameLocation;
      title?: string;
      turfName?: string;
      startsAt?: string;
      status?: MatchStatus;
      rsvpDeadline?: string | null;
    }
  ): Promise<void> {
    // If some fields are omitted, fetch current match to preserve them
    let title = updates.title;
    let turfName = updates.turfName;
    let startsAt = updates.startsAt;
    let status = updates.status;
    let rsvpDeadline = updates.rsvpDeadline;

    if (!title || !turfName || !startsAt || !status) {
      const current = await matchApi.getMatch(matchId);
      if (current) {
        title = title ?? current.title;
        turfName = turfName ?? current.turfName;
        startsAt = startsAt ?? current.startsAt;
        status = status ?? current.status;
        rsvpDeadline = rsvpDeadline !== undefined ? rsvpDeadline : current.rsvpDeadline;
      }
    }

    if(updates.location) return updateWithLocation(matchId,{p_title:title||'',p_turf_name:turfName||'',p_starts_at:startsAt?new Date(startsAt).toISOString():null,p_status:status||'scheduled',p_rsvp_deadline:rsvpDeadline?new Date(rsvpDeadline).toISOString():null},updates.location);
    const { error } = await supabase.rpc('update_match', {
      p_match: matchId,
      p_title: title || '',
      p_turf_name: turfName || '',
      p_starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
      p_status: status || 'scheduled',
      p_rsvp_deadline: rsvpDeadline ? new Date(rsvpDeadline).toISOString() : null,
    });
    if (error) throw error;
  },

  // 6. Cancel match via verified RPC
  async cancelMatch(matchId: string): Promise<void> {
    await matchApi.updateMatch(matchId, { status: 'cancelled' });
  },
};

// ============================================================================
// TanStack Query Hooks
// ============================================================================

export function useSquadMatches(squadId: string) {
  return useQuery({
    queryKey: queryKeys.matches.bySquad(squadId),
    queryFn: () => matchApi.listSquadMatches(squadId),
    enabled: Boolean(squadId),
  });
}

export function useMatch(matchId: string) {
  return useQuery<MatchDetail | null>({
    queryKey: queryKeys.matches.detail(matchId),
    queryFn: () => matchApi.getMatch(matchId),
    enabled: Boolean(matchId),
  });
}

export function useUserMatches() {
  return useQuery({
    queryKey: queryKeys.matches.all,
    queryFn: () => matchApi.listUserMatches(),
  });
}

export function useCreateMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof matchApi.createMatch>[0]) =>
      matchApi.createMatch(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.bySquad(variables.squadId) });
    },
  });
}

export function useUpdateMatch(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: {
      location?: GameLocation;
      title?: string;
      turfName?: string;
      startsAt?: string;
      status?: MatchStatus;
      rsvpDeadline?: string | null;
    }) => matchApi.updateMatch(matchId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-location',matchId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.detail(matchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.all });
    },
  });
}

export function useCancelMatch(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => matchApi.cancelMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-location',matchId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.detail(matchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.all });
    },
  });
}
