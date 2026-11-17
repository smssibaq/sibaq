export const queryKeys = {
  profile: {
    me: ['profile', 'me'] as const,
    byId: (userId: string) => ['profile', userId] as const,
  },
  squads: {
    all: ['squads'] as const,
    mySquads: ['squads', 'list'] as const,
    detail: (squadId: string) => ['squads', squadId] as const,
    members: (squadId: string) => ['squads', squadId, 'members'] as const,
    invites: (squadId: string) => ['squads', squadId, 'invites'] as const,
  },
  matches: {
    all: ['matches'] as const,
    bySquad: (squadId: string) => ['matches', 'squad', squadId] as const,
    detail: (matchId: string) => ['matches', matchId] as const,
    attendance: (matchId: string) => ['matches', matchId, 'attendance'] as const,
    myAttendance: (matchId: string) => ['matches', matchId, 'my-attendance'] as const,
    waitlist: (matchId: string) => ['matches', matchId, 'waitlist'] as const,
    myWaitlistPosition: (matchId: string) => ['matches', matchId, 'my-waitlist-position'] as const,
  },
  teams: {
    all: ['teams'] as const,
    byMatch: (matchId: string) => ['teams', 'match', matchId] as const,
    formation: (teamId: string) => ['teams', teamId, 'formation'] as const,
    players: (teamId: string) => ['team-players', teamId] as const,
  },
};
