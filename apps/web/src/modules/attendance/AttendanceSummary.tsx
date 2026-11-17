import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle2, HelpCircle, XCircle, Clock, ShieldAlert } from 'lucide-react';
import { clsx } from 'clsx';
import type { MatchMode } from '@/types/contracts';

export interface AttendanceSummaryProps {
  playingCount: number;
  maybeCount: number;
  notPlayingCount: number;
  waitlistCount?: number;
  playersPerTeam: number;
  mode: MatchMode;
  rsvpDeadline?: string | null;
  isRsvpClosed?: boolean;
  className?: string;
}

export function AttendanceSummary({
  playingCount,
  maybeCount,
  notPlayingCount,
  waitlistCount = 0,
  playersPerTeam,
  mode,
  rsvpDeadline,
  isRsvpClosed = false,
  className,
}: AttendanceSummaryProps) {
  // Friendly derby needs 2 teams, Single needs 1 team
  const targetRequired = mode === 'friendly' ? playersPerTeam * 2 : playersPerTeam;
  const isCapacityReached = playingCount >= targetRequired;
  const playersRemaining = Math.max(0, targetRequired - playingCount);
  const percentage = Math.min(100, Math.round((playingCount / targetRequired) * 100));

  return (
    <div className={clsx('space-y-4 rounded-xl border border-border bg-surface p-5 shadow-card', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Attendance & Capacity Quorum</h4>
            <p className="text-xs text-muted-foreground">
              {mode === 'friendly'
                ? `Two-Team Friendly (${playersPerTeam}v${playersPerTeam} · ${targetRequired} max capacity)`
                : `Single Squad Session (${playersPerTeam} max capacity)`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isCapacityReached ? (
            <Badge variant="success" className="gap-1 px-2.5 py-1 text-xs font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Match Full ({playingCount}/{targetRequired})</span>
            </Badge>
          ) : (
            <Badge variant="warning" className="gap-1 px-2.5 py-1 text-xs font-bold">
              <Users className="h-3.5 w-3.5" />
              <span>Need {playersRemaining} More to Fill</span>
            </Badge>
          )}

          {isRsvpClosed && (
            <Badge variant="danger" className="gap-1 px-2.5 py-1 text-xs font-bold">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Availability Closed</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Progress Bar (Confirmed Playing Only - Maybe is NOT counted) */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-foreground">
            Confirmed: <strong className="text-primary">{playingCount}</strong> of {targetRequired} max
          </span>
          <span className="text-muted-foreground">{percentage}% filled</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-subtle border border-border/50">
          <div
            className={clsx(
              'h-full transition-all duration-300 rounded-full',
              isCapacityReached ? 'bg-primary' : 'bg-primary/80'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-muted-foreground gap-1">
          <span>Note: &quot;Maybe&quot; responses are tentative and do not occupy confirmed capacity.</span>
          {waitlistCount > 0 && (
            <span className="text-primary font-bold">
              {waitlistCount} {waitlistCount === 1 ? 'player' : 'players'} waiting in queue
            </span>
          )}
        </div>
      </div>

      {/* Four-stat Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>I'm In</span>
          </div>
          <div className="text-xl font-extrabold text-foreground mt-0.5">{playingCount}</div>
        </div>

        <div className="rounded-lg border border-warning/30 bg-warning/5 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-warning">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Maybe</span>
          </div>
          <div className="text-xl font-extrabold text-foreground mt-0.5">{maybeCount}</div>
        </div>

        <div className="rounded-lg border border-danger/30 bg-danger/5 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-danger">
            <XCircle className="h-3.5 w-3.5" />
            <span>Out</span>
          </div>
          <div className="text-xl font-extrabold text-foreground mt-0.5">{notPlayingCount}</div>
        </div>

        <div className="rounded-lg border border-border/80 bg-surface-subtle p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>Waitlist</span>
          </div>
          <div className="text-xl font-extrabold text-foreground mt-0.5">{waitlistCount}</div>
        </div>
      </div>

      {/* Deadline Notice if configured */}
      {rsvpDeadline && (
        <div className="rounded-lg border border-border/60 bg-surface-subtle/50 px-3 py-2 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>Availability Cutoff Deadline:</span>
            <strong className="text-foreground">
              {new Date(rsvpDeadline).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'Asia/Kolkata',
              })} (IST)
            </strong>
          </div>
          {isRsvpClosed ? (
            <span className="text-[11px] font-bold text-danger">Closed</span>
          ) : (
            <span className="text-[11px] font-bold text-primary">Open</span>
          )}
        </div>
      )}
    </div>
  );
}
