import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { ArrowLeft, CalendarDays, MapPin, Users } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog } from '@/components/ui';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { LoadingState } from '@/components/common/loading-state';
import { useAuth } from '@/modules/auth/auth-provider';
import { RatingsPanel } from '@/modules/ratings';
import { ExpensePanel } from '@/modules/expenses';
import { formatInTimezone } from '@/lib/dates';
import { normalizeError } from '@/lib/errors';
import { useSetGameStatus, useVolleyballGame } from '../hooks';
import { VolleyballAttendance } from '../components/VolleyballAttendance';
import { VolleyballPlayerList } from '../components/VolleyballPlayerList';
import { VolleyballShare } from '../components/VolleyballShare';
import { VolleyballTeamManager } from '../components/VolleyballTeamManager';
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

export function VolleyballGamePage() {
  const { gameId } = useParams({ strict: false }) as { gameId?: string };
  const go = useVolleyballNav();
  const { user } = useAuth();
  const { data: game, isLoading, error, refetch, isRefetching } = useVolleyballGame(gameId);
  const setStatus = useSetGameStatus(gameId ?? '');
  const [confirm, setConfirm] = useState<'completed' | 'cancelled' | null>(null);

  const back = (
    <button
      type="button"
      onClick={() => go(volleyballPaths.hub)}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      All volleyball games
    </button>
  );

  if (isLoading) return <LoadingState message="Loading game..." />;

  if (error) {
    const norm = normalizeError(error);
    return (
      <div className="space-y-3">
        {back}
        <ErrorState
          title={norm.code === 'FORBIDDEN' ? 'You are not part of this game' : undefined}
          message={norm.code === 'FORBIDDEN' ? 'Ask the organizer for the invitation code to join.' : norm.message}
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
        title="Game not found"
        description="This game may have been removed."
        actionText="Back to games"
        onAction={() => go(volleyballPaths.hub)}
      />
    );
  }

  const playing = game.players.filter((p) => p.attendance_status === 'playing').length;
  const display = deriveDisplayStatus(game.status, playing, game.capacity);
  const closed = game.status === 'completed' || game.status === 'cancelled';

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      {back}

      <Card className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground leading-tight min-w-0">{game.title}</h1>
          <Badge variant={STATUS_VARIANT[display]}>{DISPLAY_STATUS_LABEL[display]}</Badge>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 shrink-0" />
            {formatInTimezone(game.starts_at)}
          </p>
          {game.venue && (
            <p className="flex items-center gap-1.5 min-w-0">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{game.venue}</span>
            </p>
          )}
          <p className="flex items-center gap-1.5">
            <Users className="h-4 w-4 shrink-0" />
            {formatFormat(game.players_per_side)} · {game.capacity} players
          </p>
        </div>
        {game.notes && <p className="text-sm text-foreground leading-relaxed border-t border-border pt-2.5">{game.notes}</p>}
      </Card>

      <VolleyballAttendance game={game} />
      <VolleyballTeamManager game={game} />
      <VolleyballPlayerList players={game.players} currentUserId={user?.id} />
      {!closed && <VolleyballShare title={game.title} code={game.invite_code} />}

      {game.is_organizer && !closed && (
        <Card className="p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Organizer</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirm('completed')}>
              Mark completed
            </Button>
            <Button variant="outline" className="text-danger" onClick={() => setConfirm('cancelled')}>
              Cancel game
            </Button>
          </div>
        </Card>
      )}

      <RatingsPanel gameId={gameId} />
      <ExpensePanel gameId={gameId} />

      <ConfirmDialog
        isOpen={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          confirm &&
          setStatus.mutate(confirm, {
            onSettled: () => setConfirm(null),
          })
        }
        title={confirm === 'cancelled' ? 'Cancel this game?' : 'Mark game as completed?'}
        message={
          confirm === 'cancelled'
            ? 'Players will see the game as cancelled and RSVPs will close.'
            : 'RSVPs and team changes will be locked.'
        }
        confirmText={confirm === 'cancelled' ? 'Cancel game' : 'Mark completed'}
        cancelText="Keep open"
        isDestructive={confirm === 'cancelled'}
        isLoading={setStatus.isPending}
      />
    </div>
  );
}
