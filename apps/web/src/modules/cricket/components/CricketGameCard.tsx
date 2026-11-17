import { CalendarDays, MapPin } from 'lucide-react';
import { Badge, Card, StatusBadge } from '@/components/ui';
import { formatInTimezone } from '@/lib/dates';
import type { CricketGameSummary } from '../types';
import {
  DISPLAY_STATUS_LABEL,
  deriveDisplayStatus,
  formatFormat,
  cricketPaths,
  useCricketNav,
  type CricketDisplayStatus,
} from '../utils';

const STATUS_VARIANT: Record<CricketDisplayStatus, 'warning' | 'success' | 'secondary' | 'danger'> = {
  upcoming: 'warning',
  ready: 'success',
  completed: 'secondary',
  cancelled: 'danger',
};

interface CricketGameCardProps {
  game: CricketGameSummary;
  onClick?: () => void;
}

export function CricketGameCard({ game, onClick }: CricketGameCardProps) {
  const go = useCricketNav();
  const display = deriveDisplayStatus(game.status, game.confirmed_count, game.capacity);
  const pct = Math.min(100, Math.round((game.confirmed_count / game.capacity) * 100));
  const href = cricketPaths.game(game.game_id);

  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        if (onClick) {
          onClick();
        } else {
          go(href);
        }
      }}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
    >
      <Card className="p-3.5 sm:p-4 space-y-3 hover:bg-surface-subtle transition-colors">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-foreground text-base leading-tight truncate min-w-0">{game.title}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className="text-xs">
              {formatFormat(game.players_per_side, game.overs_per_innings)}
            </Badge>
            <Badge variant={STATUS_VARIANT[display]}>{DISPLAY_STATUS_LABEL[display]}</Badge>
          </div>
        </div>

        <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5 min-w-0">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{formatInTimezone(game.starts_at)}</span>
          </p>
          {game.venue && (
            <p className="flex items-center gap-1.5 min-w-0">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{game.venue}</span>
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">
              {game.confirmed_count} of {game.capacity} players confirmed
            </span>
            <span className="text-muted-foreground">{formatFormat(game.players_per_side, game.overs_per_innings)}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">{game.is_organizer ? 'Hosting' : 'Joined'}</Badge>
          {game.my_status && <StatusBadge status={game.my_status} />}
        </div>
      </Card>
    </a>
  );
}
