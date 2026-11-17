import { Check, HelpCircle, X } from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from '@/components/ui';
import type { CricketAttendance as AttendanceStatus, CricketGameDetail } from '../types';
import { useSetAttendance } from '../api';

const OPTIONS: { value: AttendanceStatus; label: string; Icon: typeof Check }[] = [
  { value: 'playing', label: 'Playing', Icon: Check },
  { value: 'maybe', label: 'Maybe', Icon: HelpCircle },
  { value: 'not_playing', label: "Can't", Icon: X },
];

export function CricketAttendance({ game }: { game: CricketGameDetail }) {
  const setAttendance = useSetAttendance(game.game_id);

  const playing = game.players.filter((p) => p.attendance_status === 'playing').length;
  const maybe = game.players.filter((p) => p.attendance_status === 'maybe').length;
  const closed = game.status === 'completed' || game.status === 'cancelled';
  const full = playing >= game.capacity;
  const pct = Math.min(100, Math.round((playing / game.capacity) * 100));

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className={clsx('text-sm font-semibold', full ? 'text-success' : 'text-foreground')}>
            {playing}/{game.capacity} confirmed
          </p>
          <span className="text-xs text-muted-foreground shrink-0">{maybe} maybe</span>
        </div>
        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all', full ? 'bg-success' : 'bg-primary')}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Your RSVP</p>
        <div className="grid grid-cols-3 gap-2">
          {OPTIONS.map(({ value, label, Icon }) => {
            const active = game.my_status === value;
            const blocked = closed || (value === 'playing' && full && game.my_status !== 'playing');
            return (
              <button
                key={value}
                type="button"
                disabled={blocked || setAttendance.isPending}
                onClick={() => !active && setAttendance.mutate(value)}
                aria-pressed={active}
                className={clsx(
                  'flex h-12 min-h-control flex-col items-center justify-center gap-0.5 rounded-lg border text-xs font-semibold transition-colors',
                  'disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-surface text-foreground border-border hover:bg-surface-subtle'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
        {full && game.my_status !== 'playing' && !closed && (
          <p className="mt-2 text-xs text-muted-foreground">
            All {game.capacity} spots are taken. Pick Maybe to stay in the loop.
          </p>
        )}
        {closed && (
          <p className="mt-2 text-xs text-muted-foreground">
            This game is {game.status}. RSVPs are closed.
          </p>
        )}
      </div>
    </Card>
  );
}
