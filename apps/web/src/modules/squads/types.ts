import type {
  Squad,
  SquadMember,
  SquadRole,
  MembershipStatus,
  SquadService,
  MembershipService,
  UserProfile,
} from '@/types/contracts';

export type {
  Squad,
  SquadMember,
  SquadRole,
  MembershipStatus,
  SquadService,
  MembershipService,
  UserProfile,
};

export interface CreateSquadInput {
  name: string;
  description?: string;
}

export interface UpdateSquadSettingsInput {
  name: string;
  description?: string;
}

export interface SquadDetail extends Squad {
  currentUserRole?: SquadRole;
  currentUserStatus?: MembershipStatus;
  activeMemberCount: number;
  pendingMemberCount: number;
  isOwner: boolean;
  isAdmin: boolean;
  canManage: boolean;
}

export interface MemberActionParams {
  squadId: string;
  targetUserId: string;
  targetName: string;
  action: 'promote' | 'demote' | 'remove' | 'approve' | 'reject' | 'transfer';
}
