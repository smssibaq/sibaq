import type {
  Team,
  FormationPlayer,
  PitchCoordinate,
  FootballPosition,
  TeamService,
  FormationService,
  Match,
  MatchAttendance,
} from '@/types/contracts';

export type {
  Team,
  FormationPlayer,
  PitchCoordinate,
  FootballPosition,
  TeamService,
  FormationService,
  Match,
  MatchAttendance,
};

export type TacticalZone = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface FormationPositionPreset {
  label: string; // e.g., 'GK', 'CB', 'LB', 'CM', 'ST'
  x: number;     // Clamped percentage [6, 94] across pitch width
  y: number;     // Clamped percentage [6, 94] across pitch length
}

export interface FormationPreset {
  id: string;
  name: string;
  format: '5v5' | '6v6' | '7v7' | 'custom';
  description?: string;
  positions: FormationPositionPreset[];
}

export interface SaveFormationParams {
  teamId: string;
  formation: string;
  expectedRevision: number;
  positions: Array<{
    userId: string;
    positionLabel: string;
    isSubstitute: boolean;
    pitchX: number | null; // 0.0 to 1.0 database float
    pitchY: number | null; // 0.0 to 1.0 database float
  }>;
}

export interface LineupData {
  match: Match | null;
  teams: Team[];
  confirmedAttendance: MatchAttendance[];
}
