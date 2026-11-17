export type CricketAttendance = 'playing' | 'maybe' | 'not_playing';
export type CricketSide = 'A' | 'B';
export type CricketStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface CricketGameSummary {
  game_id: string;
  title: string;
  venue: string | null;
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
  joined_at: string;
}

export interface CricketGameDetail {
  game_id: string;
  title: string;
  venue: string | null;
  starts_at: string;
  status: CricketStatus;
  players_per_side: number;
  overs_per_innings: number;
  capacity: number;
  invite_code: string;
  is_organizer: boolean;
  my_status: CricketAttendance | null;
  notes: string | null;
  created_by: string;
  batting_order: CricketBattingSlot[];
  field_positions: CricketFieldSpot[];
  toss: { game_id:string; recorded_by:string; recorded_at:string; winning_team: CricketSide; decision: 'bat' | 'bowl' } | null;
  players: CricketPlayer[];
}

export interface CricketBattingSlot { team_side:CricketSide; player_id:string; batting_position:number }
export interface CricketFieldSpot {
  team_side:CricketSide; player_id:string; position_name:string;
  x_pos:number|null; y_pos:number|null; is_custom:boolean;
}
export interface CricketDraftAction { dirty:boolean; pending:boolean; save:()=>void }
export interface CricketFieldPosition {
  player_id: string;
  position_name: string;
  x_pos: number;
  y_pos: number;
  is_custom: boolean;
}

export interface CreateCricketGameInput {
  location?: import('@/components/location/location-service').GameLocation;
  title: string;
  venue: string | null;
  startsAt: string;
  playersPerSide: number;
  oversPerInnings: number;
  notes?: string;
  squad?: string | null;
}
