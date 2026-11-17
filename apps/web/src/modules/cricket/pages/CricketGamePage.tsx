import { useState } from 'react';
import { ArrowLeft, CalendarDays, MapPin, Users, Trophy, Shield, Clock } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog } from '@/components/ui';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { CricketDraftAction, CricketStatus } from '../types';
import { RatingsPanel } from '@/modules/ratings';
import { ExpensePanel } from '@/modules/expenses';
import { formatInTimezone } from '@/lib/dates';
import { normalizeError } from '@/lib/errors';
import { useCricketGame, useSetStatus } from '../api';
import { CricketAttendance } from '../components/CricketAttendance';
import { CricketTeamManager } from '../components/CricketTeamManager';
import { CricketToss } from '../components/CricketToss';
import { CricketLineupWorkspace } from '../components/CricketLineupWorkspace';
import { CricketResult } from '../components/CricketResult';
import { CricketShare } from '../components/CricketShare';
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

export function CricketGamePage({ gameId }: { gameId: string }) {
  const go = useCricketNav();
  const { data: game, isLoading, error, refetch, isRefetching } = useCricketGame(gameId);
  const setStatus = useSetStatus(gameId);

  const [confirmStatus, setConfirmStatus] = useState<CricketStatus | null>(null);

  const [draftAction, setDraftAction] = useState<CricketDraftAction | null>(null);

  const backLink = (
    <button
      type="button"
      onClick={() => go(cricketPaths.hub)}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      All cricket games
    </button>
  );

  if (isLoading) return <div role="status" aria-label="Loading cricket game" className="mx-auto max-w-2xl space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-64 w-full" /></div>;

  if (error) {
    const norm = normalizeError(error);
    return (
      <div className="space-y-3">
        {backLink}
        <ErrorState
          title={norm.code === 'FORBIDDEN' ? 'Access restricted' : undefined}
          message={
            norm.code === 'FORBIDDEN'
              ? 'You are not part of this match. Ask the organizer for the invite code to join.'
              : norm.message
          }
          code={norm.code}
          onRetry={() => refetch()}
          isRetrying={isRefetching}
        />
      </div>
    );
  }

  if (!game || !gameId) {
    return (
      <EmptyState
        title="Match not found"
        description="This cricket match may have been deleted or expired."
        actionText="Back to Cricket Hub"
        onAction={() => go(cricketPaths.hub)}
      />
    );
  }

  const playingCount = game.players.filter((p) => p.attendance_status === 'playing').length;
  const displayStatus = deriveDisplayStatus(game.status, playingCount, game.capacity);
  const closed = game.status === 'completed' || game.status === 'cancelled';

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-16">
      {backLink}

      {/* Match Header Overview Card */}
      <Card className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground leading-tight truncate">
              {game.title}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <Badge variant="outline" className="font-bold border-primary/40 text-primary">
                {formatFormat(game.players_per_side, game.overs_per_innings)}
              </Badge>
              <Badge variant={STATUS_VARIANT[displayStatus]}>
                {DISPLAY_STATUS_LABEL[displayStatus]}
              </Badge>
              {game.is_organizer && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Shield className="h-3 w-3" /> Organizer
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-muted-foreground pt-1 border-t border-border">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
            <span>{formatInTimezone(game.starts_at)}</span>
          </p>
          {game.venue && (
            <p className="flex items-center gap-2 min-w-0">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{game.venue}</span>
            </p>
          )}
          <p className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-primary" />
            <span>
              {game.players_per_side * 2} max squad ({game.players_per_side} per side)
            </span>
          </p>
          {game.overs_per_innings > 0 && (
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-primary" />
              <span>{game.overs_per_innings} overs per innings</span>
            </p>
          )}
        </div>

        {game.notes && (
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed border-t border-border pt-2.5">
            {game.notes}
          </p>
        )}
      </Card>

      {closed && <div role="status" className="rounded-lg border border-border bg-surface-subtle p-4 text-sm">This game is {game.status}. Attendance and lineup editing are closed.</div>}
      {/* 1. RSVP & Attendance Section */}
      <CricketAttendance game={game} />

      {/* 2. Team A vs Team B Rosters */}
      <CricketTeamManager game={game} />

      {/* 3. Toss Section */}
      <CricketToss game={game} />

      {/* 4. Complete Tactical Lineup Workspace (Fielding Ground, Batting Order, Bowling Plan, Bench) */}
      <div id="cricket-lineup" className="scroll-mt-4"><CricketLineupWorkspace game={game} onDraftChange={setDraftAction} /></div>

      {/* 5. Match Result & Scorecard */}
      <CricketResult key={game.game_id} game={game} />

      {/* 6. Invite & Share Card */}
      {!closed && <CricketShare title={game.title} code={game.invite_code} />}

      {/* 7. Organizer Administration Actions */}
      {game.is_organizer && (
        <Card className="p-4 space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Match Operations (Organizer Only)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={() => setConfirmStatus(closed ? 'scheduled' : 'completed')}
              className="text-xs font-bold"
            >
              <Trophy className="h-3.5 w-3.5 mr-1 text-primary" />
              {closed ? 'Reopen game' : 'Mark completed'}
            </Button>
            <Button
              variant="outline"
              className="text-xs font-bold text-danger border-danger/30 hover:bg-danger/10"
              disabled={game.status === 'cancelled'}
              onClick={() => setConfirmStatus('cancelled')}
            >
              Cancel Match
            </Button>
          </div>
        </Card>
      )}

      {/* 8. Shared Integration: Player Ratings & Match Reviews */}
      {new Date(game.starts_at).getTime() <= Date.now() && (game.is_organizer || game.my_status === 'playing') && <RatingsPanel gameId={gameId} />}

      {/* 9. Shared Integration: Ground & Match Expense Splitting */}
      {(game.is_organizer || game.my_status === 'playing') && <ExpensePanel gameId={gameId} />}

      {!closed && <div className="sticky bottom-0 z-20 rounded-xl border border-border bg-surface/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        {game.is_organizer ? draftAction?.dirty ? <div className="flex items-center justify-between gap-3"><span className="text-sm">Unsaved lineup changes</span><Button onClick={draftAction.save} isLoading={draftAction.pending}>Save lineup</Button></div> : <a href="#cricket-lineup" className="flex min-h-11 items-center justify-center rounded-md bg-primary px-4 font-bold text-primary-foreground">Manage lineup</a> : <CricketAttendance game={game} compact />}
      </div>}
      {/* Confirm Dialog for Status Changes */}
      <ConfirmDialog
        isOpen={confirmStatus !== null && game.is_organizer}
        onClose={() => setConfirmStatus(null)}
        onConfirm={() =>
          confirmStatus &&
          setStatus.mutate(confirmStatus, {
            onSettled: () => setConfirmStatus(null),
          })
        }
        title={confirmStatus === 'scheduled' ? 'Reopen this cricket game?' : confirmStatus === 'cancelled' ? 'Cancel this cricket match?' : 'Mark match as completed?'}
        message={
          confirmStatus === 'scheduled' ? 'Attendance and lineup editing will open again.' : confirmStatus === 'cancelled'
            ? 'Attendees will see the match as cancelled and lineups will be locked.'
            : 'Match will be marked completed and RSVPs locked.'
        }
        confirmText={confirmStatus === 'scheduled' ? 'Reopen' : confirmStatus === 'cancelled' ? 'Cancel match' : 'Mark completed'}
        cancelText="Keep open"
        isDestructive={confirmStatus === 'cancelled'}
        isLoading={setStatus.isPending}
      />
    </div>
  );
}
