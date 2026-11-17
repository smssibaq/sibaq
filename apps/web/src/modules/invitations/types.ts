export type {
  SquadInvitation,
  InvitationService,
} from '@/types/contracts';

export interface JoinByCodeInput {
  code: string;
}

export interface JoinByInviteInput {
  token: string;
}
