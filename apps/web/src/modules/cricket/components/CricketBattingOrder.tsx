import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, X, Plus, Save, User, Crown, Shield } from 'lucide-react';
import { Avatar, Button, useToast } from '@/components/ui';
import type { CricketGameDetail, CricketSide } from '../types';
import { useSetBattingOrder } from '../api';

export function CricketBattingOrder({ game }: { game: CricketGameDetail }) {
  const { toast } = useToast();
  const setBattingOrder = useSetBattingOrder(game.game_id);
  const [activeSide, setActiveSide] = useState<CricketSide>('A');

  // Filter confirmed players belonging to the active team
  const teamPlayers = game.players.filter(
    (p) => p.attendance_status === 'playing' && p.team_side === activeSide
  );

  // Local batting order state: ordered list of player user_ids
  const [orderedPlayerIds, setOrderedPlayerIds] = useState<string[]>([]);

  // Sync from incoming game data
  useEffect(() => {
    const assignedWithPos = teamPlayers
      .filter((p) => typeof p.batting_position === 'number' && p.batting_position > 0)
      .sort((a, b) => (a.batting_position ?? 0) - (b.batting_position ?? 0));

    if (assignedWithPos.length > 0) {
      setOrderedPlayerIds(assignedWithPos.map((p) => p.user_id));
    } else {
      // Default: sequential by team list
      setOrderedPlayerIds(teamPlayers.map((p) => p.user_id));
    }
  }, [game.players, activeSide]);

  const closed = game.status === 'completed' || game.status === 'cancelled';
  const canEdit = game.is_organizer && !closed;

  const moveUp = (index: number) => {
    if (index === 0 || !canEdit) return;
    setOrderedPlayerIds((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index === orderedPlayerIds.length - 1 || !canEdit) return;
    setOrderedPlayerIds((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const removePlayer = (userId: string) => {
    if (!canEdit) return;
    setOrderedPlayerIds((prev) => prev.filter((id) => id !== userId));
  };

  const addPlayer = (userId: string) => {
    if (!canEdit || orderedPlayerIds.includes(userId)) return;
    setOrderedPlayerIds((prev) => [...prev, userId]);
  };

  const handleSave = () => {
    const assignments = orderedPlayerIds.map((playerId, idx) => ({
      player_id: playerId,
      batting_position: idx + 1,
    }));

    setBattingOrder.mutate(
      { side: activeSide, assignments },
      {
        onSuccess: () => {
          toast.success('Batting Order Saved', `Team ${activeSide} batting order successfully updated.`);
        },
      }
    );
  };

  // Players on this team not yet in the batting order
  const availableToAdd = teamPlayers.filter((p) => !orderedPlayerIds.includes(p.user_id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Batting Lineup</h3>
          <p className="text-xs text-muted-foreground">Reorder batters from opening pair to tail</p>
        </div>
        <div className="flex items-center gap-1.5 bg-surface-subtle p-1 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setActiveSide('A')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              activeSide === 'A'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Team A
          </button>
          <button
            type="button"
            onClick={() => setActiveSide('B')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              activeSide === 'B'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Team B
          </button>
        </div>
      </div>

      {orderedPlayerIds.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <User className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-60" />
          <p className="text-xs font-semibold text-foreground">No batters assigned to Team {activeSide}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Assign players to Team {activeSide} in the Team Rosters section first.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {orderedPlayerIds.map((userId, index) => {
            const player = teamPlayers.find((p) => p.user_id === userId);
            if (!player) return null;
            const isOpener = index === 0 || index === 1;

            return (
              <div
                key={userId}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-subtle p-2 transition-all"
              >
                {/* Position Badge */}
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold ${
                    isOpener
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface text-foreground border border-border'
                  }`}
                >
                  {index + 1}
                </span>

                {/* Avatar */}
                <Avatar
                  src={player.avatar_url ?? undefined}
                  fallback={player.name}
                  size="sm"
                  className="h-7 w-7 text-[11px]"
                />

                {/* Name & Badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground truncate">{player.name}</span>
                    {player.is_captain && (
                      <span className="inline-flex items-center gap-0.5 px-1 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Crown className="h-2.5 w-2.5" /> C
                      </span>
                    )}
                    {player.is_wicketkeeper && (
                      <span className="inline-flex items-center gap-0.5 px-1 rounded text-[9px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                        <Shield className="h-2.5 w-2.5" /> WK
                      </span>
                    )}
                    {isOpener && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
                        Opener
                      </span>
                    )}
                  </div>
                </div>

                {/* Reorder & Remove Controls */}
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveUp(index)}
                      className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                      aria-label="Move batter up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === orderedPlayerIds.length - 1}
                      onClick={() => moveDown(index)}
                      className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                      aria-label="Move batter down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePlayer(userId)}
                      className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-danger"
                      aria-label="Remove from batting order"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Available to Add Section */}
      {canEdit && availableToAdd.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-2.5 space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Add to Batting Order
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availableToAdd.map((p) => (
              <button
                key={p.user_id}
                type="button"
                onClick={() => addPlayer(p.user_id)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-surface-subtle border border-border hover:border-primary/50 text-foreground transition-colors"
              >
                <Plus className="h-3 w-3 text-primary" />
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      {canEdit && orderedPlayerIds.length > 0 && (
        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            onClick={handleSave}
            isLoading={setBattingOrder.isPending}
            className="bg-primary text-primary-foreground font-bold text-xs"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save Team {activeSide} Batting Order
          </Button>
        </div>
      )}
    </div>
  );
}
