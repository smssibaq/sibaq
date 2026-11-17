// Volleyball DB types (Dev C). Mirrors migration volleyball_core.
// Shared fields (title, venue, starts_at, status) come from public.games via the RPCs below.

export type VolleyballAttendance = 'playing' | 'maybe' | 'not_playing';
export type VolleyballTeamSide = 'A' | 'B';
/** Values stored in public.games.status. */
export type VolleyballDbStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type VolleyballPlayersPerSide = 4 | 6;

/** Row returned by rpc volleyball_list_my_games(). */
export interface VolleyballGameSummary {
  game_id: string;
  title: string;
  venue: string | null;
  starts_at: string;
  status: VolleyballDbStatus;
  players_per_side: VolleyballPlayersPerSide;
  capacity: number;
  invite_code: string;
  is_organizer: boolean;
  my_status: VolleyballAttendance | null;
  playing_count: number;
  maybe_count: number;
}

export interface VolleyballPlayer {
  user_id: string;
  name: string;
  avatar_url: string | null;
  attendance_status: VolleyballAttendance;
  team_side: VolleyballTeamSide | null;
  joined_at: string;
}

/** jsonb returned by rpc volleyball_get_game(). */
export interface VolleyballGameDetail {
  game_id: string;
  title: string;
  venue: string | null;
  starts_at: string;
  status: VolleyballDbStatus;
  players_per_side: VolleyballPlayersPerSide;
  capacity: number;
  invite_code: string;
  notes: string | null;
  created_by: string;
  is_organizer: boolean;
  my_status: VolleyballAttendance | null;
  players: VolleyballPlayer[];
}

/** Row returned by rpc volleyball_preview_by_code(). */
export interface VolleyballInvitePreview {
  game_id: string;
  title: string;
  venue: string | null;
  starts_at: string;
  status: VolleyballDbStatus;
  players_per_side: VolleyballPlayersPerSide;
  capacity: number;
  playing_count: number;
  already_joined: boolean;
}

export interface CreateVolleyballGameInput {
  title: string;
  venue: string;
  startsAt: string; // ISO
  playersPerSide: VolleyballPlayersPerSide;
  notes?: string;
}
