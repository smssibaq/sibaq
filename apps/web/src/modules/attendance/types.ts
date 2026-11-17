import type {
  MatchAttendance,
  AttendanceStatus,
  AttendanceService,
  UserProfile,
  MatchMode,
  FootballPosition,
} from '@/types/contracts';

export type {
  MatchAttendance,
  AttendanceStatus,
  AttendanceService,
  UserProfile,
  MatchMode,
  FootballPosition,
};

export interface AttendanceCounts {
  playing: number;
  maybe: number;
  notPlaying: number;
  waitlist: number;
  total: number;
}

export interface MatchWaitlistEntry {
  id: string;
  matchId: string;
  userId: string;
  createdAt: string;
  queuePosition: number;
  profile?: UserProfile | null;
}

export interface AttendanceRosterGrouped {
  playing: MatchAttendance[];
  maybe: MatchAttendance[];
  notPlaying: MatchAttendance[];
  waitlist: MatchWaitlistEntry[];
}

export interface ExtendedAttendanceService extends AttendanceService {
  setAttendance(matchId: string, status: AttendanceStatus, adminOverride?: boolean): Promise<void>;
  joinWaitlist(matchId: string): Promise<number>;
  leaveWaitlist(matchId: string): Promise<void>;
  listWaitlist(matchId: string): Promise<MatchWaitlistEntry[]>;
  getMyWaitlistPosition(matchId: string): Promise<number | null>;
}
