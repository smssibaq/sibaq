import type { BadmintonFunctions, BadmintonTables } from './sports/badminton.db';
import type { CricketFunctions, CricketTables } from './sports/cricket.db';
// volleyball.db.ts (Dev C) currently exports domain types only; no typed tables/RPCs to merge yet.
type VolleyballTables = Record<never, never>;
type VolleyballFunctions = Record<never, never>;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'user';
export type ItemStatus = 'draft' | 'active' | 'archived';
export type SquadRole = 'owner' | 'admin' | 'player';
export type MembershipStatus = 'active' | 'pending';
export type MatchMode = 'single' | 'friendly';
export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type AttendanceStatus = 'playing' | 'maybe' | 'not_playing';
export type FootballPosition = 'GK' | 'DEF' | 'MID' | 'ATT';
/** Keys of public.sports. Add a key here when a new sport module is registered. */
export type SportKey = 'football' | 'badminton' | 'cricket' | 'volleyball';
export type GameStatus = MatchStatus;

export interface Database {
  public: {
    Tables: CoreTables & BadmintonTables & CricketTables & VolleyballTables;
    Views: {
      [_ in never]: never;
    };
    Functions: CoreFunctions & BadmintonFunctions & CricketFunctions & VolleyballFunctions;
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

/** Shared + football tables (platform-owned). Sport tables live in ./sports/*.db.ts */
type CoreTables = {
  game_expenses: {
    Row: {
      id: string; game_id: string; sport: SportKey; organizer_id: string;
      base_amount: number; extra_amount: number; total_amount: number;
      description: string | null; created_at: string; updated_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  game_expense_shares: {
    Row: {
      id: string; expense_id: string; player_id: string;
      share_amount: number; paid_amount: number; is_manual: boolean;
      status: 'paid' | 'partial' | 'unpaid'; updated_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  profiles: {
    Row: {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
      preferred_position: string | null;
      secondary_position: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id: string;
      display_name?: string | null;
      avatar_url?: string | null;
      preferred_position?: string | null;
      secondary_position?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      display_name?: string | null;
      avatar_url?: string | null;
      preferred_position?: string | null;
      secondary_position?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  squads: {
    Row: {
      id: string;
      name: string;
      description: string | null;
      owner_id: string;
      join_code: string;
      default_sport: SportKey;
      created_at: string;
    };
    Insert: {
      id?: string;
      name: string;
      description?: string | null;
      owner_id: string;
      join_code?: string;
      default_sport?: SportKey;
      created_at?: string;
    };
    Update: {
      id?: string;
      name?: string;
      description?: string | null;
      owner_id?: string;
      join_code?: string;
      default_sport?: SportKey;
      created_at?: string;
    };
    Relationships: [];
  };
  squad_members: {
    Row: {
      squad_id: string;
      user_id: string;
      role: SquadRole;
      status: MembershipStatus;
      joined_at: string;
    };
    Insert: {
      squad_id: string;
      user_id: string;
      role?: SquadRole;
      status?: MembershipStatus;
      joined_at?: string;
    };
    Update: {
      squad_id?: string;
      user_id?: string;
      role?: SquadRole;
      status?: MembershipStatus;
      joined_at?: string;
    };
    Relationships: [];
  };
  squad_invitations: {
    Row: {
      id: string;
      squad_id: string;
      token_hash: string;
      created_by: string;
      expires_at: string;
      revoked_at: string | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      squad_id: string;
      token_hash: string;
      created_by: string;
      expires_at?: string;
      revoked_at?: string | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      squad_id?: string;
      token_hash?: string;
      created_by?: string;
      expires_at?: string;
      revoked_at?: string | null;
      created_at?: string;
    };
    Relationships: [];
  };
  matches: {
    Row: {
      id: string;
      squad_id: string;
      title: string;
      mode: MatchMode;
      turf_name: string;
      starts_at: string;
      players_per_team: number;
      rsvp_deadline: string | null;
      status: MatchStatus;
      sport: 'football';
      created_by: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      squad_id: string;
      title: string;
      mode?: MatchMode;
      turf_name: string;
      starts_at: string;
      players_per_team?: number;
      rsvp_deadline?: string | null;
      status?: MatchStatus;
      sport?: 'football';
      created_by: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      squad_id?: string;
      title?: string;
      mode?: MatchMode;
      turf_name?: string;
      starts_at?: string;
      players_per_team?: number;
      rsvp_deadline?: string | null;
      status?: MatchStatus;
      sport?: 'football';
      created_by?: string;
      created_at?: string;
    };
    Relationships: [];
  };
  match_attendance: {
    Row: {
      match_id: string;
      user_id: string;
      status: AttendanceStatus;
      updated_at: string;
    };
    Insert: {
      match_id: string;
      user_id: string;
      status?: AttendanceStatus;
      updated_at?: string;
    };
    Update: {
      match_id?: string;
      user_id?: string;
      status?: AttendanceStatus;
      updated_at?: string;
    };
    Relationships: [];
  };
  match_waitlist: {
    Row: {
      id: string;
      match_id: string;
      user_id: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      match_id: string;
      user_id: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      match_id?: string;
      user_id?: string;
      created_at?: string;
    };
    Relationships: [];
  };
  teams: {
    Row: {
      id: string;
      match_id: string;
      name: string;
      side: string;
      color: string;
      formation: string;
      revision: number;
    };
    Insert: {
      id?: string;
      match_id: string;
      name: string;
      side?: string;
      color?: string;
      formation?: string;
      revision?: number;
    };
    Update: {
      id?: string;
      match_id?: string;
      name?: string;
      side?: string;
      color?: string;
      formation?: string;
      revision?: number;
    };
    Relationships: [];
  };
  team_players: {
    Row: {
      id: string;
      team_id: string;
      match_id: string;
      user_id: string;
      position_label: string;
      is_substitute: boolean;
      pitch_x: number | null;
      pitch_y: number | null;
    };
    Insert: {
      id?: string;
      team_id: string;
      match_id: string;
      user_id: string;
      position_label: string;
      is_substitute?: boolean;
      pitch_x?: number | null;
      pitch_y?: number | null;
    };
    Update: {
      id?: string;
      team_id?: string;
      match_id?: string;
      user_id?: string;
      position_label?: string;
      is_substitute?: boolean;
      pitch_x?: number | null;
      pitch_y?: number | null;
    };
    Relationships: [];
  };
  squad_audit: {
    Row: {
      id: string;
      squad_id: string;
      actor_id: string;
      action: string;
      details: Json | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      squad_id: string;
      actor_id: string;
      action: string;
      details?: Json | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      squad_id?: string;
      actor_id?: string;
      action?: string;
      details?: Json | null;
      created_at?: string;
    };
    Relationships: [];
  };
  sports: {
    Row: {
      key: SportKey;
      name: string;
      owner: string;
      game_table: string | null;
      confirmed_players_fn: string | null;
      organizer_check_fn: string | null;
      is_team_sport: boolean;
      min_players: number | null;
      max_players: number | null;
      is_enabled: boolean;
      sort_order: number;
      created_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  games: {
    Row: {
      id: string;
      sport: SportKey;
      squad_id: string | null;
      title: string;
      venue: string | null;
      starts_at: string;
      status: GameStatus;
      created_by: string;
      created_at: string;
      updated_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  // Legacy backward-compatible starter table
  sample_items: {
    Row: {
      id: string;
      owner_id: string;
      title: string;
      description: string | null;
      status: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      owner_id?: string;
      title: string;
      description?: string | null;
      status?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      owner_id?: string;
      title?: string;
      description?: string | null;
      status?: string;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  user_roles: {
    Row: {
      id: string;
      user_id: string;
      role: UserRole;
      created_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      role?: UserRole;
      created_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      role?: UserRole;
      created_at?: string;
    };
    Relationships: [];
  };
};

/** Shared + football RPCs (platform-owned). Sport RPCs live in ./sports/*.db.ts */
type CoreFunctions = {
  create_game_expense: {
    Args: { p_game: string; p_base_amount: number; p_extra_amount?: number; p_description?: string | null };
    Returns: string;
  };
  update_game_expense: {
    Args: { p_expense: string; p_base_amount: number; p_extra_amount?: number; p_description?: string | null };
    Returns: void;
  };
  resplit_game_expense: {
    Args: { p_expense: string };
    Returns: void;
  };
  set_expense_share: {
    Args: { p_expense: string; p_player: string; p_share_amount: number | null };
    Returns: void;
  };
  record_expense_payment: {
    Args: { p_expense: string; p_player: string; p_paid_amount: number };
    Returns: void;
  };
  get_game_expense_summary: {
    Args: { p_game: string };
    Returns: Json;
  };
  create_squad: {
    Args: { p_name: string; p_description: string | null };
    Returns: string;
  };
  join_squad: {
    Args: { p_code: string };
    Returns: string;
  };
  create_squad_invite: {
    Args: { p_squad: string };
    Returns: string;
  };
  join_squad_by_invite: {
    Args: { p_token: string };
    Returns: string;
  };
  approve_member: {
    Args: { p_squad: string; p_user: string };
    Returns: void;
  };
  set_member_role: {
    Args: { p_squad: string; p_user: string; p_role: string };
    Returns: void;
  };
  remove_squad_member: {
    Args: { p_squad: string; p_user: string };
    Returns: void;
  };
  transfer_squad_owner: {
    Args: { p_squad: string; p_new_owner: string };
    Returns: void;
  };
  create_match: {
    Args: {
      p_squad: string;
      p_title: string;
      p_mode: string;
      p_turf_name: string;
      p_starts_at: string;
      p_players_per_team: number;
      p_rsvp_deadline?: string | null;
    };
    Returns: string;
  };
  update_match: {
    Args: {
      p_match: string;
      p_title: string;
      p_turf_name: string;
      p_starts_at: string;
      p_status: string;
      p_rsvp_deadline?: string | null;
    };
    Returns: void;
  };
  set_attendance: {
    Args: { p_match: string; p_status: string; p_admin_override?: boolean };
    Returns: void;
  };
  join_waitlist: {
    Args: { p_match: string };
    Returns: number;
  };
  leave_waitlist: {
    Args: { p_match: string };
    Returns: void;
  };
  get_match_waitlist: {
    Args: { p_match: string };
    Returns: Array<{
      id: string;
      match_id: string;
      user_id: string;
      created_at: string;
      queue_position: number;
      display_name: string | null;
      avatar_url: string | null;
      preferred_position: string | null;
    }>;
  };
  assign_team_player: {
    Args: { p_team: string; p_user: string; p_position: string };
    Returns: void;
  };
  remove_team_player: {
    Args: { p_match: string; p_user: string };
    Returns: void;
  };
  save_team_formation: {
    Args: {
      p_team: string;
      p_formation: string;
      p_expected_revision: number;
      p_positions: Json;
    };
    Returns: number;
  };
  is_admin: {
    Args: { check_user_id: string };
    Returns: boolean;
  };
  get_game_context: {
    Args: { p_game: string };
    Returns: Array<{
      game_id: string;
      sport: SportKey;
      squad_id: string | null;
      title: string;
      venue: string | null;
      starts_at: string;
      status: GameStatus;
      is_organizer: boolean;
      is_participant: boolean;
      confirmed_count: number;
    }>;
  };
  game_sport: {
    Args: { p_game: string };
    Returns: SportKey;
  };
  is_game_organizer: {
    Args: { p_game: string; p_user: string };
    Returns: boolean;
  };
  is_game_participant: {
    Args: { p_game: string; p_user: string };
    Returns: boolean;
  };
  can_view_game: {
    Args: { p_game: string; p_user: string };
    Returns: boolean;
  };
};


