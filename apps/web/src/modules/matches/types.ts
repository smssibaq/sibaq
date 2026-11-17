import type {
  Match,
  MatchMode,
  MatchStatus,
  MatchService,
  AttendanceStatus,
  Team,
} from '@/types/contracts';

export type {
  Match,
  MatchMode,
  MatchStatus,
  MatchService,
  AttendanceStatus,
  Team,
};

export interface MatchDetail extends Match {
  teams?: Team[];
  rsvpDeadline?: string | null;
  waitlistCount?: number;
  isRsvpClosed?: boolean;
  maxCapacity?: number;
}

export interface CreateMatchInput {
  squadId: string;
  title: string;
  mode: MatchMode;
  turfName: string;
  startsAt: string;
  playersPerTeam: number;
  locationDescription?: string;
  rsvpDeadline?: string | null;
}

export interface UpdateMatchInput {
  matchId: string;
  title?: string;
  turfName?: string;
  startsAt?: string;
  status?: MatchStatus;
  rsvpDeadline?: string | null;
}

export interface KeralaTurfPreset {
  name: string;
  city: string;
  district?: string;
}

export interface MatchFilterOptions {
  squadId?: string;
  status?: MatchStatus;
  mode?: MatchMode;
}
