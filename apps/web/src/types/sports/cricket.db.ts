/**
 * Cricket database types — owned by Developer B. Only cricket_* tables and RPCs go here.
 * Merged into Database['public'] by ../database.types.ts, so supabase.from('cricket_games')
 * and supabase.rpc('cricket_create_game', ...) are fully typed.
 * Source: supabase/migrations/20261117162337_cricket_core.sql
 */

export type CricketAttendance = 'playing' | 'maybe' | 'not_playing';
export type CricketSide = 'A' | 'B';
export type CricketStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type CricketPlayersPerSide = 5 | 6 | 7 | 8 | 11;

export type CricketTables = {
  cricket_games: {
    Row: {
      id: string;
      sport: 'cricket';
      players_per_side: CricketPlayersPerSide;
      overs_per_innings: number;
      invite_code: string;
      notes: string | null;
      created_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  cricket_game_players: {
    Row: {
      game_id: string;
      user_id: string;
      attendance_status: CricketAttendance;
      lineup_bench: boolean;
      lineup_x: number | null;
      lineup_y: number | null;
      joined_at: string;
      updated_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  cricket_team_players: {
    Row: {
      game_id: string;
      user_id: string;
      team_side: CricketSide;
      captain: boolean;
      wicketkeeper: boolean;
      batting_position: number | null;
      assigned_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  cricket_batting_order: {
    Row: {
      id: string;
      game_id: string;
      team_side: CricketSide;
      player_id: string;
      batting_position: number;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  cricket_field_positions: {
    Row: {
      id: string;
      game_id: string;
      team_side: CricketSide;
      player_id: string;
      position_name: string;
      x_pos: number | null;
      y_pos: number | null;
      is_custom: boolean;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
  cricket_toss: {
    Row: {
      game_id: string;
      winning_team: CricketSide;
      decision: 'bat' | 'bowl';
      recorded_by: string;
      recorded_at: string;
    };
    Insert: never;
    Update: never;
    Relationships: [];
  };
};

export type CricketFunctions = {
  cricket_get_lineup_layout:{Args:{p_game:string};Returns:import('../database.types').Json};
  cricket_save_lineup_layout:{Args:{p_game:string;p_rows:import('../database.types').Json};Returns:void};
  cricket_list_my_games: { Args: Record<string, never>; Returns: Array<{
    game_id:string; title:string; venue:string|null; starts_at:string; status:CricketStatus;
    players_per_side:number; overs_per_innings:number; capacity:number; invite_code:string;
    is_organizer:boolean; confirmed_count:number; my_status:CricketAttendance|null;
  }> };
  cricket_get_game: { Args:{p_game:string}; Returns:import('../database.types').Json };
  cricket_set_batting_order: { Args:{p_game:string;p_side:CricketSide;p_assignments:import('../database.types').Json};Returns:void };
  cricket_set_field_positions: { Args:{p_game:string;p_side:CricketSide;p_positions:import('../database.types').Json};Returns:void };
  cricket_create_game: {
    Args: {
      p_title: string;
      p_venue: string;
      p_starts_at: string;
      p_players_per_side?: number;
      p_overs?: number;
      p_notes?: string | null;
      p_squad?: string | null;
    };
    Returns: string;
  };
  cricket_join_by_code: {
    Args: { p_code: string };
    Returns: string;
  };
  cricket_set_attendance: {
    Args: { p_game: string; p_status: CricketAttendance };
    Returns: void;
  };
  cricket_set_team: {
    Args: { p_game: string; p_user: string; p_side: CricketSide | null };
    Returns: void;
  };
  cricket_auto_balance: {
    Args: { p_game: string };
    Returns: void;
  };
  cricket_set_captain: {
    Args: { p_game: string; p_user: string | null; p_side: CricketSide };
    Returns: void;
  };
  cricket_set_wicketkeeper: {
    Args: { p_game: string; p_user: string | null; p_side: CricketSide };
    Returns: void;
  };
  cricket_record_toss: {
    Args: { p_game: string; p_winning_team: CricketSide; p_decision: 'bat' | 'bowl' };
    Returns: void;
  };
  cricket_set_status: {
    Args: { p_game: string; p_status: Exclude<CricketStatus, 'in_progress'> };
    Returns: void;
  };
};
