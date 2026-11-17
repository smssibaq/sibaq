import { Badge, type BadgeProps } from './badge';
import type { AttendanceStatus, MatchStatus, MembershipStatus, SquadRole } from '@/types/database.types';

export interface StatusBadgeProps {
  status: AttendanceStatus | MatchStatus | MembershipStatus | SquadRole | string;
  className?: string;
}

const STATUS_LABELS: Record<string, string> = {
  owner: 'Squad Owner',
  admin: 'Squad Admin',
  player: 'Player',
  active: 'Active',
  pending: 'Pending',
  scheduled: 'Scheduled',
  in_progress: 'Live',
  completed: 'Completed',
  cancelled: 'Cancelled',
  playing: "I'm In",
  not_playing: "Can't Make It",
  maybe: 'Maybe',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let variant: BadgeProps['variant'] = 'secondary';
  const label = STATUS_LABELS[status] || status.replace(/_/g, ' ');

  switch (status) {
    case 'playing':
    case 'active':
    case 'in_progress':
    case 'owner':
      variant = 'success';
      break;
    case 'maybe':
    case 'scheduled':
    case 'pending':
    case 'admin':
      variant = 'warning';
      break;
    case 'not_playing':
    case 'cancelled':
      variant = 'danger';
      break;
    case 'completed':
    case 'player':
      variant = 'secondary';
      break;
    default:
      variant = 'secondary';
  }

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

export const AppStatusBadge = StatusBadge;
