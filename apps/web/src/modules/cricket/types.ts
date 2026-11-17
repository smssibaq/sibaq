export type CricketAttendance = 'playing' | 'maybe' | 'not_playing';
export type CricketSide = 'A' | 'B';
export type CricketStatus = 'scheduled' | 'completed' | 'cancelled';

export interface CricketGameSummary {
  game_id: string;
  title: string;
  venue: string;
  starts_at: string;
  status: CricketStatus;
  players_per_side: number;
  overs_per_innings: number;
  capacity: number;
  invite_code: string;
  is_organizer: boolean;
  confirmed_count: number;
  my_status: CricketAttendance | null;
}

export interface CricketPlayer {
  user_id: string;
  name: string;
  avatar_url: string | null;
  attendance_status: CricketAttendance;
  team_side: CricketSide | null;
  batting_position: number | null;
  is_captain: boolean;
  is_wicketkeeper: boolean;
}

export interface CricketGameDetail {
  game_id: string;
  title: string;
  venue: string;
  starts_at: string;
  status: CricketStatus;
  players_per_side: number;
  overs_per_innings: number;
  capacity: number;
  invite_code: string;
  is_organizer: boolean;
  my_status: CricketAttendance | null;
  notes: string | null;
  toss: { winning_team: CricketSide; decision: 'bat' | 'bowl' } | null;
  players: CricketPlayer[];
}

export interface CricketFieldPosition {
  player_id: string;
  position_name: string;
  x_pos: number;
  y_pos: number;
  is_custom: boolean;
}

export interface CreateCricketGameInput {
  title: string;
  venue: string;
  startsAt: string;
  playersPerSide: number;
  oversPerInnings: number;
  notes?: string;
}
