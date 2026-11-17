/**
 * Badminton database types — owned by Developer A. Only badminton_* tables and RPCs go here.
 * Merged into Database['public'] by ../database.types.ts.
 * Source: supabase/migrations/20261117145537_badminton_core.sql
 */
export type BadmintonFormat = 'singles' | 'doubles';
export type BadmintonRsvpStatus = 'in' | 'maybe' | 'out';
export type BadmintonSide = 'A' | 'B';

export type BadmintonTables = {
  badminton_games: {
    Row: {
      id: string;
      sport: 'badminton';
      format: BadmintonFormat;
      capacity: number;
      court: string | null;
      skill_level: string | null;
      result_score: string | null;
      winner_side: BadmintonSide | null;
      result_recorded_at: string | null;
      created_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  badminton_rsvps: {
    Row: {
      game_id: string;
      user_id: string;
      status: BadmintonRsvpStatus;
      updated_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  badminton_pairs: {
    Row: {
      game_id: string;
      side: BadmintonSide;
      user_id: string;
      created_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
};

export type BadmintonFunctions = {
  badminton_update_game: {
    Args: { p_game: string; p_title: string; p_venue: string; p_starts_at: string };
    Returns: void;
  };
  badminton_create_game: {
    Args: {
      p_squad: string;
      p_title: string;
      p_venue: string | null;
      p_starts_at: string;
      p_format?: BadmintonFormat;
      p_court?: string | null;
      p_skill_level?: string | null;
    };
    Returns: string;
  };
  badminton_set_rsvp: {
    Args: { p_game: string; p_status: BadmintonRsvpStatus };
    Returns: void;
  };
  badminton_set_pairs: {
    Args: { p_game: string; p_side_a: string[]; p_side_b: string[] };
    Returns: void;
  };
  badminton_record_result: {
    Args: { p_game: string; p_score: string | null; p_winner_side: BadmintonSide | null };
    Returns: void;
  };
};
