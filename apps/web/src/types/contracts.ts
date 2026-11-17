import type { SquadRole, MembershipStatus, MatchMode, MatchStatus, AttendanceStatus, FootballPosition } from './database.types';

export type { SquadRole, MembershipStatus, MatchMode, MatchStatus, AttendanceStatus, FootballPosition };

export interface PitchCoordinate {
  x: number; // Normalized [0, 1] across pitch width
  y: number; // Normalized [0, 1] across pitch length
}

export interface FormationPlayer {
  userId: string;
  teamId: string;
  positionLabel: string;
  isSubstitute: boolean;
  coordinate: PitchCoordinate | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface UserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  preferredPosition: FootballPosition | null;
  createdAt: string;
  updatedAt: string;
}

export interface Squad {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  joinCode: string;
  createdAt: string;
  memberCount?: number;
  role?: SquadRole;
}

export interface SquadMember {
  squadId: string;
  userId: string;
  role: SquadRole;
  status: MembershipStatus;
  joinedAt: string;
  profile?: UserProfile | null;
}

export interface SquadInvitation {
  id: string;
  squadId: string;
  createdBy: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface Match {
  id: string;
  squadId: string;
  title: string;
  mode: MatchMode;
  turfName: string;
  startsAt: string;
  playersPerTeam: number;
  status: MatchStatus;
  createdBy: string;
  createdAt: string;
  squadName?: string;
  attendanceCount?: {
    playing: number;
    maybe: number;
    notPlaying: number;
  };
}

export interface MatchAttendance {
  matchId: string;
  userId: string;
  status: AttendanceStatus | 'unconfirmed';
  updatedAt: string;
  profile?: UserProfile | null;
}

export interface Team {
  id: string;
  matchId: string;
  name: string;
  side: string;
  color: string;
  formation: string;
  revision: number;
  players?: FormationPlayer[];
}

// -------------------------------------------------------------
// Service Interfaces (Contracts for Developers A, B, and C)
// -------------------------------------------------------------

export interface SquadService {
  createSquad(name: string, description?: string): Promise<string>;
  getSquad(squadId: string): Promise<Squad | null>;
  listMySquads(): Promise<Squad[]>;
  joinSquadByCode(code: string): Promise<string>;
  updateSquad(squadId: string, updates: { name?: string; description?: string }): Promise<void>;
}

export interface InvitationService {
  createInvite(squadId: string): Promise<string>;
  joinByInvite(token: string): Promise<string>;
  listInvites(squadId: string): Promise<SquadInvitation[]>;
  revokeInvite(inviteId: string): Promise<void>;
}

export interface MembershipService {
  listMembers(squadId: string): Promise<SquadMember[]>;
  approveMember(squadId: string, userId: string): Promise<void>;
  setMemberRole(squadId: string, userId: string, role: SquadRole): Promise<void>;
  removeMember(squadId: string, userId: string): Promise<void>;
  transferOwnership(squadId: string, newOwnerId: string): Promise<void>;
}

export interface MatchService {
  createMatch(params: {
    squadId: string;
    title: string;
    mode: MatchMode;
    turfName: string;
    startsAt: string;
    playersPerTeam: number;
  }): Promise<string>;
  getMatch(matchId: string): Promise<Match | null>;
  listSquadMatches(squadId: string): Promise<Match[]>;
  updateMatch(matchId: string, updates: {
    title?: string;
    turfName?: string;
    startsAt?: string;
    status?: MatchStatus;
  }): Promise<void>;
}

export interface AttendanceService {
  setAttendance(matchId: string, status: AttendanceStatus): Promise<void>;
  listAttendance(matchId: string): Promise<MatchAttendance[]>;
  getMyAttendance(matchId: string): Promise<AttendanceStatus | null>;
}

export interface TeamService {
  listMatchTeams(matchId: string): Promise<Team[]>;
  assignPlayer(
    teamId: string,
    userId: string,
    position?: string,
    isSubstitute?: boolean,
    coordinate?: PitchCoordinate | null
  ): Promise<void>;
  removePlayer(matchId: string, userId: string): Promise<void>;
}

export interface FormationService {
  saveFormation(params: {
    teamId: string;
    formation: string;
    expectedRevision: number;
    positions: Array<{
      userId: string;
      positionLabel: string;
      isSubstitute: boolean;
      pitchX: number | null;
      pitchY: number | null;
    }>;
  }): Promise<number>;
}
