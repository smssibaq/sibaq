import { supabase } from '@/infrastructure/supabase/client';
import type { Team, TeamService, FormationService, MatchAttendance, PitchCoordinate, FormationPlayer } from './types';
import type { SaveFormationParams } from './types';
import type { Json } from '@/types/database.types';
import type { AttendanceStatus, FootballPosition } from '@/types/contracts';
import { AppError } from '@/lib/errors';
import { GOALKEEPER_DUPLICATE_MESSAGE } from './schema';

export interface ExtendedTeamService extends TeamService, FormationService {
  listConfirmedMatchPlayers(matchId: string): Promise<MatchAttendance[]>;
  getTeamPlayers(teamId: string): Promise<FormationPlayer[]>;
  assignTeamPlayer(
    teamId: string,
    userId: string,
    position?: string,
    isSubstitute?: boolean,
    coordinate?: PitchCoordinate | null
  ): Promise<void>;
  updatePlayerPosition(
    teamId: string,
    userId: string,
    positionLabel: string
  ): Promise<void>;
}

interface ProfileRow {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  preferred_position?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const teamApi: ExtendedTeamService = {
  // 1. List match teams with assigned players & coordinates normalized to percentage [0-100]
  async listMatchTeams(matchId: string): Promise<Team[]> {
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, match_id, name, side, color, formation, revision')
      .eq('match_id', matchId)
      .order('side', { ascending: true });

    if (teamsError) throw teamsError;
    if (!teamsData || teamsData.length === 0) return [];

    const teamIds = teamsData.map((t) => t.id);
    const { data: playersData, error: playersError } = await supabase
      .from('team_players')
      .select('id, team_id, match_id, user_id, position_label, is_substitute, pitch_x, pitch_y')
      .in('team_id', teamIds);

    if (playersError) throw playersError;

    // Fetch user profiles for players
    const userIds = (playersData || []).map((p) => p.user_id);
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('profiles').select('*').in('id', userIds)
      : { data: [] };

    const profileList = (profiles as unknown as ProfileRow[]) || [];

    return teamsData.map((t) => {
      const assigned = (playersData || [])
        .filter((p) => p.team_id === t.id)
        .map((p) => {
          const prof = profileList.find((pr) => pr.id === p.user_id);
          const resolvedName =
            prof?.display_name ||
            prof?.full_name ||
            (prof?.email ? prof.email.split('@')[0] : null) ||
            `Player ${p.user_id.slice(0, 4)}`;

          // Convert DB 0.0-1.0 float to 0-100 percentage for UI rendering
          let coordX: number | null = null;
          let coordY: number | null = null;

          if (p.pitch_x !== null && p.pitch_y !== null) {
            const rawX = Number(p.pitch_x);
            const rawY = Number(p.pitch_y);
            coordX = rawX <= 1.0 ? Math.round(rawX * 100) : rawX;
            coordY = rawY <= 1.0 ? Math.round(rawY * 100) : rawY;
          }

          return {
            userId: p.user_id,
            teamId: p.team_id,
            positionLabel: p.position_label,
            isSubstitute: p.is_substitute,
            coordinate: coordX !== null && coordY !== null ? { x: coordX, y: coordY } : null,
            displayName: resolvedName,
            avatarUrl: prof?.avatar_url || null,
          };
        });

      return {
        id: t.id,
        matchId: t.match_id,
        name: t.name,
        side: t.side,
        color: t.color,
        formation: t.formation,
        revision: t.revision,
        players: assigned,
      };
    });
  },

  // 2. Fetch players for a specific isolated team (enforces strict team isolation)
  async getTeamPlayers(teamId: string): Promise<FormationPlayer[]> {
    const { data: playersData, error: playersError } = await supabase
      .from('team_players')
      .select('id, team_id, match_id, user_id, position_label, is_substitute, pitch_x, pitch_y')
      .eq('team_id', teamId);

    if (playersError) throw playersError;
    if (!playersData || playersData.length === 0) return [];

    const userIds = playersData.map((p) => p.user_id);
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
    const profileList = (profiles as unknown as ProfileRow[]) || [];

    return playersData.map((p) => {
      const prof = profileList.find((pr) => pr.id === p.user_id);
      const resolvedName =
        prof?.display_name ||
        prof?.full_name ||
        (prof?.email ? prof.email.split('@')[0] : null) ||
        `Player ${p.user_id.slice(0, 4)}`;

      let coordX: number | null = null;
      let coordY: number | null = null;

      if (p.pitch_x !== null && p.pitch_y !== null) {
        const rawX = Number(p.pitch_x);
        const rawY = Number(p.pitch_y);
        coordX = rawX <= 1.0 ? Math.round(rawX * 100) : rawX;
        coordY = rawY <= 1.0 ? Math.round(rawY * 100) : rawY;
      }

      return {
        userId: p.user_id,
        teamId: p.team_id,
        positionLabel: p.position_label,
        isSubstitute: p.is_substitute,
        coordinate: coordX !== null && coordY !== null ? { x: coordX, y: coordY } : null,
        displayName: resolvedName,
        avatarUrl: prof?.avatar_url || null,
      };
    });
  },

  // 3. Assign player to team via verified RPC (defaulting to substitute with null coordinates)
  async assignPlayer(
    teamId: string,
    userId: string,
    position = 'SUB',
    isSubstitute = true,
    coordinate?: PitchCoordinate | null
  ): Promise<void> {
    const isTargetGk = position.trim().toUpperCase() === 'GK' && !isSubstitute;

    // Strict single goalkeeper pre-check
    if (isTargetGk) {
      const { data: existingGk } = await supabase
        .from('team_players')
        .select('user_id, position_label')
        .eq('team_id', teamId)
        .neq('user_id', userId);

      const hasGk = (existingGk || []).some(
        (p) => p.position_label?.trim().toUpperCase() === 'GK'
      );
      if (hasGk) {
        throw new AppError(GOALKEEPER_DUPLICATE_MESSAGE, 'CONFLICT', 409);
      }
    }

    const { data: team, error: teamError } = await supabase.from('teams').select('match_id').eq('id', teamId).single();
    if (teamError) throw teamError;
    const { data: attendance, error: attendanceError } = await supabase.from('match_attendance').select('status').eq('match_id', team.match_id).eq('user_id', userId).maybeSingle();
    if (attendanceError) throw attendanceError;
    if (attendance?.status !== 'playing') throw new Error("Only players with a Playing Availability can join active lineups.");

    // 2. If assigning as substitute or coordinates are null, explicitly use 'SUB' to bypass 'Valid pitch coordinates required' check
    const effectivePosition = isSubstitute || !coordinate ? 'SUB' : position;

    const { error } = await supabase.rpc('assign_team_player', {
      p_team: teamId,
      p_user: userId,
      p_position: effectivePosition,
    });

    if (error) {
      if (
        error.code === '23505' ||
        error.message?.includes('goalkeeper') ||
        error.details?.includes('goalkeeper') ||
        error.message?.includes('unique_goalkeeper_per_team') ||
        error.details?.includes('unique_goalkeeper_per_team')
      ) {
        throw new AppError(GOALKEEPER_DUPLICATE_MESSAGE, 'CONFLICT', 409);
      }

      throw error;
    }
  },

  // Alias for assignTeamPlayer
  async assignTeamPlayer(
    teamId: string,
    userId: string,
    position = 'SUB',
    isSubstitute = true,
    coordinate?: PitchCoordinate | null
  ): Promise<void> {
    return this.assignPlayer(teamId, userId, position, isSubstitute, coordinate);
  },

  // 3. Update player position with goalkeeper enforcement
  async updatePlayerPosition(
    teamId: string,
    userId: string,
    positionLabel: string
  ): Promise<void> {
    const normPos = positionLabel.trim().toUpperCase();

    if (normPos === 'GK') {
      const { data: existingGk } = await supabase
        .from('team_players')
        .select('user_id, position_label')
        .eq('team_id', teamId)
        .neq('user_id', userId);

      const hasGk = (existingGk || []).some(
        (p) => p.position_label?.trim().toUpperCase() === 'GK'
      );
      if (hasGk) {
        throw new AppError(GOALKEEPER_DUPLICATE_MESSAGE, 'CONFLICT', 409);
      }
    }

    const { error } = await supabase
      .from('team_players')
      .update({ position_label: positionLabel })
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) {
      if (
        error.code === '23505' ||
        error.message?.includes('goalkeeper') ||
        error.details?.includes('goalkeeper') ||
        error.message?.includes('unique_goalkeeper_per_team') ||
        error.details?.includes('unique_goalkeeper_per_team')
      ) {
        throw new AppError(GOALKEEPER_DUPLICATE_MESSAGE, 'CONFLICT', 409);
      }
      throw error;
    }
  },

  // 4. Remove player from team via verified RPC
  async removePlayer(matchId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('remove_team_player', {
      p_match: matchId,
      p_user: userId,
    });
    if (error) throw error;
  },

  // 5. Save tactical formation & positions with revision verification and goalkeeper enforcement
  async saveFormation(params: SaveFormationParams): Promise<number> {
    // 1. Validate single goalkeeper rule upfront
    const gkCount = params.positions.filter(
      (p) => p.positionLabel?.trim().toUpperCase() === 'GK'
    ).length;
    if (gkCount > 1) {
      throw new AppError(GOALKEEPER_DUPLICATE_MESSAGE, 'CONFLICT', 409);
    }

    // 2. Inspect authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new AppError('You must be signed in to save match formations.', 'UNAUTHENTICATED', 401);
    }

    // 3. Validate team ID & get match ID
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id, match_id, revision')
      .eq('id', params.teamId)
      .single();

    if (teamError || !teamData) {
      throw new AppError('Team not found.', 'NOT_FOUND', 404);
    }

    // 4. Inspect related match & squad
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('id, squad_id, players_per_team')
      .eq('id', teamData.match_id)
      .single();

    if (matchError || !matchData?.squad_id) {
      throw new AppError('Match or squad not found.', 'NOT_FOUND', 404);
    }

    // 5. Verify user membership in squad (owner or admin)
    const [squadRes, memberRes, adminRes] = await Promise.all([
      supabase.from('squads').select('id, owner_id').eq('id', matchData.squad_id).maybeSingle(),
      supabase
        .from('squad_members')
        .select('role, status')
        .eq('squad_id', matchData.squad_id)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle(),
    ]);

    const isSquadOwner = squadRes.data?.owner_id === user.id || memberRes.data?.role === 'owner';
    const isSquadAdmin = memberRes.data?.role === 'admin' && memberRes.data?.status === 'active';
    const isAppAdmin = adminRes.data?.role === 'admin';

    if (!isSquadOwner && !isSquadAdmin && !isAppAdmin) {
      throw new AppError(
        'Forbidden: Only squad owners and administrators are authorized to save lineups and formations.',
        'FORBIDDEN',
        403
      );
    }

    // 7. Format positions payload with strict x/y/position contract and normalization [0, 1]
    const formattedPositions = params.positions.map((p) => {
      let normX = p.pitchX;
      let normY = p.pitchY;

      if (normX !== null && normX !== undefined) {
        if (normX > 1.0) normX = normX / 100;
        normX = Math.max(0, Math.min(1, Number(normX.toFixed(4))));
      } else {
        normX = null;
      }

      if (normY !== null && normY !== undefined) {
        if (normY > 1.0) normY = normY / 100;
        normY = Math.max(0, Math.min(1, Number(normY.toFixed(4))));
      } else {
        normY = null;
      }

      const posLabel = p.positionLabel || (p.isSubstitute ? 'SUB' : 'MID');

      return {
        user_id: p.userId,
        x: normX,
        y: normY,
        position: posLabel,
        position_label: posLabel,
        is_substitute: p.isSubstitute,
        pitch_x: normX,
        pitch_y: normY,
      };
    });

    const { data, error } = await supabase.rpc('save_team_formation', {
      p_team: params.teamId,
      p_formation: params.formation,
      p_expected_revision: params.expectedRevision,
      p_positions: formattedPositions as unknown as Json,
    });

    if (error) {
      if (
        error.code === '23505' ||
        error.message?.includes('goalkeeper') ||
        error.details?.includes('goalkeeper') ||
        error.message?.includes('unique_goalkeeper_per_team') ||
        error.details?.includes('unique_goalkeeper_per_team')
      ) {
        throw new AppError(GOALKEEPER_DUPLICATE_MESSAGE, 'CONFLICT', 409);
      }
      if (
        error.code === '40001' ||
        error.code === 'P0003' ||
        error.message?.toLowerCase().includes('revision') ||
        error.message?.toLowerCase().includes('conflict')
      ) {
        throw new AppError(
          'Conflict: Lineup revision mismatch. Another captain updated this lineup.',
          'CONFLICT',
          409
        );
      }
      if (
        error.code === '42501' ||
        error.message?.toLowerCase().includes('authorized') ||
        error.message?.toLowerCase().includes('forbidden')
      ) {
        throw new AppError(
          'Forbidden: Only squad owners and administrators are authorized to save formations.',
          'FORBIDDEN',
          403
        );
      }
      throw error;
    }
    return typeof data === 'number' ? data : params.expectedRevision + 1;
  },

  // 5. Fetch all active squad members merged with match attendance
  async listConfirmedMatchPlayers(matchId: string): Promise<MatchAttendance[]> {
    const { data: rows, error } = await supabase.from('match_attendance').select('user_id,status,updated_at').eq('match_id', matchId).eq('status', 'playing');
    if (error) throw error;
    if (!rows?.length) return [];
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('id,display_name,avatar_url,preferred_position').in('id', rows.map(r => r.user_id));
    if (profileError) throw profileError;
    return rows.map(row => { const profile = profiles?.find(p => p.id === row.user_id); return {
      matchId, userId: row.user_id, status: 'playing' as AttendanceStatus, updatedAt: row.updated_at,
      profile: profile ? { id: profile.id, displayName: profile.display_name, avatarUrl: profile.avatar_url, preferredPosition: profile.preferred_position as FootballPosition | null, createdAt: '', updatedAt: '' } : null,
    }; });
  },
};
