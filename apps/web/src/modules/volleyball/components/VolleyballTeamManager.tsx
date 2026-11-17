import { Shuffle, X } from 'lucide-react';
import { Avatar, Button, Card } from '@/components/ui';
import type { VolleyballGameDetail, VolleyballPlayer, VolleyballTeamSide } from '@/types/sports/volleyball.db';
import { useAutoBalance, useSetTeam } from '../hooks';

function TeamColumn({
  side,
  players,
  max,
  isOrganizer,
  onMove,
}: {
  side: VolleyballTeamSide;
  players: VolleyballPlayer[];
  max: number;
  isOrganizer: boolean;
  onMove: (userId: string, side: VolleyballTeamSide | null) => void;
}) {
  const other: VolleyballTeamSide = side === 'A' ? 'B' : 'A';
  return (
    <div className="rounded-lg border border-border bg-surface-subtle p-2.5 space-y-2 min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-primary">Team {side}</h3>
        <span className="text-xs text-muted-foreground">
          {players.length}/{max}
        </span>
      </div>
      {players.length === 0 && <p className="text-xs text-muted-foreground">No players yet</p>}
      <ul className="space-y-1.5">
        {players.map((p) => (
          <li key={p.user_id} className="flex items-center gap-1.5 min-w-0">
            <Avatar src={p.avatar_url} fallback={p.name} size="sm" className="h-6 w-6 text-[10px]" />
            <span className="text-xs text-foreground truncate flex-1">{p.name}</span>
            {isOrganizer && (
              <>
                <button
                  type="button"
                  onClick={() => onMove(p.user_id, other)}
                  className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold hover:bg-secondary"
                  aria-label={`Move ${p.name} to team ${other}`}
                >
                  → {other}
                </button>
                <button
                  type="button"
                  onClick={() => onMove(p.user_id, null)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-danger"
                  aria-label={`Remove ${p.name} from team`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VolleyballTeamManager({ game }: { game: VolleyballGameDetail }) {
  const setTeam = useSetTeam(game.game_id);
  const autoBalance = useAutoBalance(game.game_id);
  const closed = game.status === 'completed' || game.status === 'cancelled';
  const canEdit = game.is_organizer && !closed;

  const confirmed = game.players.filter((p) => p.attendance_status === 'playing');
  const teamA = confirmed.filter((p) => p.team_side === 'A');
  const teamB = confirmed.filter((p) => p.team_side === 'B');
  const unassigned = confirmed.filter((p) => !p.team_side);
  const max = game.players_per_side;

  if (confirmed.length < 2 && teamA.length + teamB.length === 0) {
    return (
      <Card className="p-4 space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Teams</h2>
        <p className="text-sm text-muted-foreground">Teams unlock once at least 2 players are confirmed.</p>
      </Card>
    );
  }

  const move = (userId: string, side: VolleyballTeamSide | null) => canEdit && setTeam.mutate({ userId, side });

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Teams</h2>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => autoBalance.mutate()}
            isLoading={autoBalance.isPending}
            disabled={confirmed.length < 2}
          >
            <Shuffle className="mr-1.5 h-3.5 w-3.5" />
            Auto balance
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <TeamColumn side="A" players={teamA} max={max} isOrganizer={canEdit} onMove={move} />
        <TeamColumn side="B" players={teamB} max={max} isOrganizer={canEdit} onMove={move} />
      </div>

      {unassigned.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Unassigned ({unassigned.length})</p>
          <ul className="space-y-1.5">
            {unassigned.map((p) => (
              <li key={p.user_id} className="flex items-center gap-2 min-w-0">
                <Avatar src={p.avatar_url} fallback={p.name} size="sm" className="h-6 w-6 text-[10px]" />
                <span className="text-sm text-foreground truncate flex-1">{p.name}</span>
                {canEdit && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" variant="secondary" className="h-8 px-3" onClick={() => move(p.user_id, 'A')} disabled={teamA.length >= max || setTeam.isPending}>
                      A
                    </Button>
                    <Button size="sm" variant="secondary" className="h-8 px-3" onClick={() => move(p.user_id, 'B')} disabled={teamB.length >= max || setTeam.isPending}>
                      B
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!game.is_organizer && <p className="text-xs text-muted-foreground">Only the organizer can change teams.</p>}
    </Card>
  );
}
