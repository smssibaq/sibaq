import { Shuffle, X, Crown, Shield } from 'lucide-react';
import { Avatar, Button, Card } from '@/components/ui';
import type { CricketGameDetail, CricketPlayer, CricketSide } from '../types';
import { useAutoBalance, useSetCaptain, useSetTeam, useSetWicketkeeper } from '../api';

function TeamColumn({
  side,
  players,
  max,
  isOrganizer,
  onMove,
  onSetCaptain,
  onSetWicketkeeper,
}: {
  side: CricketSide;
  players: CricketPlayer[];
  max: number;
  isOrganizer: boolean;
  onMove: (userId: string, side: CricketSide | null) => void;
  onSetCaptain: (userId: string, side: CricketSide) => void;
  onSetWicketkeeper: (userId: string, side: CricketSide) => void;
}) {
  const other: CricketSide = side === 'A' ? 'B' : 'A';
  return (
    <div className="rounded-lg border border-border bg-surface-subtle p-2.5 space-y-2 min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-primary">Team {side}</h3>
        <span className="text-xs text-muted-foreground font-mono">
          {players.length}/{max}
        </span>
      </div>
      {players.length === 0 && (
        <p className="text-xs text-muted-foreground py-2 text-center">No players assigned</p>
      )}
      <ul className="space-y-1.5">
        {players.map((p) => (
          <li
            key={p.user_id}
            className="flex items-center gap-1.5 min-w-0 rounded-md bg-surface p-1.5 border border-border/60"
          >
            <Avatar src={p.avatar_url ?? undefined} fallback={p.name} size="sm" className="h-6 w-6 text-[10px]" />
            <div className="truncate flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-foreground truncate">{p.name}</span>
                {p.is_captain && (
                  <span
                    title="Team Captain"
                    className="inline-flex items-center gap-0.5 px-1 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  >
                    <Crown className="h-2.5 w-2.5" /> C
                  </span>
                )}
                {p.is_wicketkeeper && (
                  <span
                    title="Wicketkeeper"
                    className="inline-flex items-center gap-0.5 px-1 rounded text-[9px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30"
                  >
                    <Shield className="h-2.5 w-2.5" /> WK
                  </span>
                )}
              </div>
            </div>

            {isOrganizer && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onSetCaptain(p.user_id, side)}
                  title={p.is_captain ? 'Captain' : 'Make Captain'}
                  className={`rounded p-1 text-[10px] font-bold transition-colors ${
                    p.is_captain
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'text-muted-foreground hover:bg-surface-subtle hover:text-amber-400'
                  }`}
                  aria-label={`Make ${p.name} captain`}
                >
                  <Crown className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onSetWicketkeeper(p.user_id, side)}
                  title={p.is_wicketkeeper ? 'Wicketkeeper' : 'Make Wicketkeeper'}
                  className={`rounded p-1 text-[10px] font-bold transition-colors ${
                    p.is_wicketkeeper
                      ? 'bg-sky-500/20 text-sky-400'
                      : 'text-muted-foreground hover:bg-surface-subtle hover:text-sky-400'
                  }`}
                  aria-label={`Make ${p.name} wicketkeeper`}
                >
                  <Shield className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(p.user_id, other)}
                  className="rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold text-foreground hover:bg-secondary transition-colors"
                  aria-label={`Move ${p.name} to team ${other}`}
                >
                  → {other}
                </button>
                <button
                  type="button"
                  onClick={() => onMove(p.user_id, null)}
                  className="rounded p-1 text-muted-foreground hover:text-danger transition-colors"
                  aria-label={`Remove ${p.name} from team`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CricketTeamManager({ game }: { game: CricketGameDetail }) {
  const setTeam = useSetTeam(game.game_id);
  const autoBalance = useAutoBalance(game.game_id);
  const setCaptain = useSetCaptain(game.game_id);
  const setWicketkeeper = useSetWicketkeeper(game.game_id);

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
        <p className="text-sm text-muted-foreground">
          Teams unlock once at least 2 players are confirmed.
        </p>
      </Card>
    );
  }

  const move = (userId: string, side: CricketSide | null) => {
    if (!canEdit) return;
    setTeam.mutate({ userId, side });
  };

  const handleSetCaptain = (userId: string, side: CricketSide) => {
    if (!canEdit) return;
    setCaptain.mutate({ userId, side });
  };

  const handleSetWicketkeeper = (userId: string, side: CricketSide) => {
    if (!canEdit) return;
    setWicketkeeper.mutate({ userId, side });
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Team Rosters</h2>
          <p className="text-xs text-muted-foreground">
            {confirmed.length} confirmed · {teamA.length} on A · {teamB.length} on B
          </p>
        </div>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TeamColumn
          side="A"
          players={teamA}
          max={max}
          isOrganizer={canEdit}
          onMove={move}
          onSetCaptain={handleSetCaptain}
          onSetWicketkeeper={handleSetWicketkeeper}
        />
        <TeamColumn
          side="B"
          players={teamB}
          max={max}
          isOrganizer={canEdit}
          onMove={move}
          onSetCaptain={handleSetCaptain}
          onSetWicketkeeper={handleSetWicketkeeper}
        />
      </div>

      {unassigned.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Unassigned Confirmed Players ({unassigned.length})
          </p>
          <ul className="space-y-1.5">
            {unassigned.map((p) => (
              <li
                key={p.user_id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-surface-subtle p-2 min-w-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar src={p.avatar_url ?? undefined} fallback={p.name} size="sm" className="h-6 w-6 text-[10px]" />
                  <span className="text-xs font-medium text-foreground truncate">{p.name}</span>
                </div>
                {canEdit && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 px-2.5 text-xs font-bold"
                      onClick={() => move(p.user_id, 'A')}
                      disabled={teamA.length >= max || setTeam.isPending}
                    >
                      + Team A
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 px-2.5 text-xs font-bold"
                      onClick={() => move(p.user_id, 'B')}
                      disabled={teamB.length >= max || setTeam.isPending}
                    >
                      + Team B
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!game.is_organizer && (
        <p className="text-xs text-muted-foreground pt-1">
          Only the match organizer can assign teams and roles.
        </p>
      )}
    </Card>
  );
}
