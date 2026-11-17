import { CheckCircle2, HelpCircle, XCircle, UserMinus } from 'lucide-react';
import { Avatar, Button } from '@/components/ui';
import type { CricketGameDetail, CricketSide } from '../types';
import { useSetTeam } from '../api';

export function CricketSubstituteBench({ game }: { game: CricketGameDetail }) {
  const setTeam = useSetTeam(game.game_id);

  const closed = game.status === 'completed' || game.status === 'cancelled';
  const canEdit = game.is_organizer && !closed;

  const confirmedPlayers = game.players.filter((p) => p.attendance_status === 'playing');
  const maybePlayers = game.players.filter((p) => p.attendance_status === 'maybe');
  const notPlayingPlayers = game.players.filter((p) => p.attendance_status === 'not_playing');

  const movePlayer = (userId: string, side: CricketSide | null) => {
    if (!canEdit) return;
    setTeam.mutate({ userId, side });
  };

  return (
    <div className="space-y-4">
      {/* 1. Confirmed Squad & Active Substitutes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Confirmed Squad ({confirmedPlayers.length})
            </h4>
          </div>
          <span className="text-[11px] text-muted-foreground">Eligible for Team A or B</span>
        </div>

        {confirmedPlayers.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">No confirmed players yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {confirmedPlayers.map((p) => (
              <div
                key={p.user_id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border bg-surface-subtle"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar src={p.avatar_url ?? undefined} fallback={p.name} size="sm" className="h-7 w-7 text-xs" />
                  <div className="truncate min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {p.team_side ? `Team ${p.team_side}` : 'On Bench (Unassigned)'}
                    </p>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant={p.team_side === 'A' ? 'default' : 'outline'}
                      className="h-6 px-2 text-[10px] font-bold"
                      onClick={() => movePlayer(p.user_id, p.team_side === 'A' ? null : 'A')}
                    >
                      A
                    </Button>
                    <Button
                      size="sm"
                      variant={p.team_side === 'B' ? 'default' : 'outline'}
                      className="h-6 px-2 text-[10px] font-bold"
                      onClick={() => movePlayer(p.user_id, p.team_side === 'B' ? null : 'B')}
                    >
                      B
                    </Button>
                    {p.team_side && (
                      <button
                        type="button"
                        onClick={() => movePlayer(p.user_id, null)}
                        title="Move to Bench"
                        className="rounded p-1 text-muted-foreground hover:text-foreground"
                      >
                        <UserMinus className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Provisional Substitutes (Maybe RSVP) */}
      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-warning" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Provisional Standbys / Maybe ({maybePlayers.length})
            </h4>
          </div>
          <span className="text-[10px] text-muted-foreground">Locks into squad upon confirmation</span>
        </div>

        {maybePlayers.length === 0 ? (
          <p className="text-xs text-muted-foreground py-1 text-center">No tentative players</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {maybePlayers.map((p) => (
              <div
                key={p.user_id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg border border-dashed border-border bg-surface opacity-80"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar src={p.avatar_url ?? undefined} fallback={p.name} size="sm" className="h-6 w-6 text-[10px]" />
                  <span className="text-xs font-medium text-foreground truncate">{p.name}</span>
                </div>
                <span className="text-[10px] font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full border border-warning/20">
                  Tentative
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Unavailable / Out Players */}
      {notPlayingPlayers.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-danger" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Unavailable ({notPlayingPlayers.length})
            </h4>
          </div>

          <div className="flex flex-wrap gap-2">
            {notPlayingPlayers.map((p) => (
              <span
                key={p.user_id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-surface text-muted-foreground border border-border"
              >
                <Avatar src={p.avatar_url ?? undefined} fallback={p.name} size="sm" className="h-4 w-4 text-[9px]" />
                <span className="line-through">{p.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
