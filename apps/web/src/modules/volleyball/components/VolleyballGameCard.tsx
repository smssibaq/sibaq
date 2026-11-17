import { CalendarDays, MapPin } from 'lucide-react';
import { Badge, Card, StatusBadge } from '@/components/ui';
import { formatInTimezone } from '@/lib/dates';
import type { VolleyballGameSummary } from '@/types/sports/volleyball.db';
import {
  DISPLAY_STATUS_LABEL,
  deriveDisplayStatus,
  formatFormat,
  volleyballPaths,
  useVolleyballNav,
  type VolleyballDisplayStatus,
} from '../utils';

const STATUS_VARIANT: Record<VolleyballDisplayStatus, 'warning' | 'success' | 'secondary' | 'danger'> = {
  upcoming: 'warning',
  ready: 'success',
  completed: 'secondary',
  cancelled: 'danger',
};

export function VolleyballGameCard({ game }: { game: VolleyballGameSummary }) {
  const go = useVolleyballNav();
  const display = deriveDisplayStatus(game.status, game.playing_count, game.capacity);
  const pct = Math.min(100, Math.round((game.playing_count / game.capacity) * 100));
  const href = volleyballPaths.game(game.game_id);

  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        go(href);
      }}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
    >
      <Card className="p-3.5 sm:p-4 space-y-3 hover:bg-surface-subtle transition-colors">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground text-base leading-tight truncate min-w-0">{game.title}</h3>
          <Badge variant={STATUS_VARIANT[display]}>{DISPLAY_STATUS_LABEL[display]}</Badge>
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
              {game.playing_count} of {game.capacity} players confirmed
            </span>
            <span className="text-muted-foreground">{formatFormat(game.players_per_side)}</span>
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
