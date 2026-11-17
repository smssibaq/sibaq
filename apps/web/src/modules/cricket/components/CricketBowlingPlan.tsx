import { useState } from 'react';
import { Plus, X, ArrowUp, ArrowDown, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { Avatar, Button, useToast } from '@/components/ui';
import type { CricketGameDetail, CricketSide } from '../types';

interface BowlingSlot {
  playerId: string;
  plannedOvers: number;
}

export function CricketBowlingPlan({ game }: { game: CricketGameDetail }) {
  const { toast } = useToast();
  const [activeSide, setActiveSide] = useState<CricketSide>('A');

  // Bowlers are from the bowling side (e.g. if Team A is bowling)
  const teamPlayers = game.players.filter(
    (p) => p.attendance_status === 'playing' && p.team_side === activeSide
  );

  const totalMatchOvers = game.overs_per_innings > 0 ? game.overs_per_innings : 10; // Default 10 if unlimited

  // Local state for bowling plan
  const [plan, setPlan] = useState<BowlingSlot[]>(() => {
    return teamPlayers.slice(0, 4).map((p) => ({
      playerId: p.user_id,
      plannedOvers: Math.max(1, Math.floor(totalMatchOvers / Math.max(1, Math.min(4, teamPlayers.length)))),
    }));
  });

  const closed = game.status === 'completed' || game.status === 'cancelled';
  const canEdit = game.is_organizer && !closed;

  const totalPlannedOvers = plan.reduce((sum, slot) => sum + slot.plannedOvers, 0);
  const remainingOvers = totalMatchOvers - totalPlannedOvers;

  const addBowler = (userId: string) => {
    if (!canEdit || plan.some((s) => s.playerId === userId)) return;
    setPlan((prev) => [...prev, { playerId: userId, plannedOvers: 1 }]);
  };

  const removeBowler = (userId: string) => {
    if (!canEdit) return;
    setPlan((prev) => prev.filter((s) => s.playerId !== userId));
  };

  const updateOvers = (index: number, delta: number) => {
    if (!canEdit) return;
    setPlan((prev) => {
      const copy = [...prev];
      const newOvers = Math.max(1, copy[index].plannedOvers + delta);
      copy[index] = { ...copy[index], plannedOvers: newOvers };
      return copy;
    });
  };

  const moveUp = (index: number) => {
    if (index === 0 || !canEdit) return;
    setPlan((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index === plan.length - 1 || !canEdit) return;
    setPlan((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleSave = () => {
    toast.success('Bowling Plan Saved', `Team ${activeSide} bowling sequence and overs locked.`);
  };

  const availableBowlers = teamPlayers.filter((p) => !plan.some((s) => s.playerId === p.user_id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Bowling Plan</h3>
          <p className="text-xs text-muted-foreground">
            Overs quota and bowling sequence ({totalMatchOvers} overs innings)
          </p>
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

      {/* Overs Allocation Summary Card */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-subtle">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Total Innings Overs</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono font-bold">
          <span className="text-muted-foreground">
            Planned: <strong className="text-foreground">{totalPlannedOvers}</strong> / {totalMatchOvers}
          </span>
          {remainingOvers === 0 ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" /> Balanced
            </span>
          ) : remainingOvers > 0 ? (
            <span className="inline-flex items-center gap-1 text-amber-400">
              <AlertCircle className="h-3.5 w-3.5" /> {remainingOvers} overs left
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-danger">
              <AlertCircle className="h-3.5 w-3.5" /> {Math.abs(remainingOvers)} over limit!
            </span>
          )}
        </div>
      </div>

      {/* Bowlers List */}
      {plan.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No bowlers added to plan yet.</p>
      ) : (
        <div className="space-y-1.5">
          {plan.map((slot, idx) => {
            const player = teamPlayers.find((p) => p.user_id === slot.playerId);
            if (!player) return null;

            return (
              <div
                key={slot.playerId}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-subtle p-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-surface border border-border font-mono text-[10px] font-bold text-muted-foreground">
                    #{idx + 1}
                  </span>
                  <Avatar
                    src={player.avatar_url ?? undefined}
                    fallback={player.name}
                    size="sm"
                    className="h-6 w-6 text-[10px]"
                  />
                  <span className="text-xs font-semibold text-foreground truncate">{player.name}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Overs control */}
                  <div className="flex items-center rounded-md border border-border bg-surface">
                    <button
                      type="button"
                      disabled={!canEdit || slot.plannedOvers <= 1}
                      onClick={() => updateOvers(idx, -1)}
                      className="px-2 py-0.5 text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="px-1.5 text-xs font-mono font-bold text-primary">
                      {slot.plannedOvers} ov
                    </span>
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => updateOvers(idx, 1)}
                      className="px-2 py-0.5 text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>

                  {/* Reorder & remove */}
                  {canEdit && (
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveUp(idx)}
                        className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-foreground disabled:opacity-30"
                        aria-label="Move bowler up"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === plan.length - 1}
                        onClick={() => moveDown(idx)}
                        className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-foreground disabled:opacity-30"
                        aria-label="Move bowler down"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBowler(slot.playerId)}
                        className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-danger"
                        aria-label="Remove bowler"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add bowler options */}
      {canEdit && availableBowlers.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-2.5 space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Add Bowler to Rotation
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availableBowlers.map((p) => (
              <button
                key={p.user_id}
                type="button"
                onClick={() => addBowler(p.user_id)}
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
      {canEdit && (
        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-primary text-primary-foreground font-bold text-xs"
          >
            Save Bowling Plan
          </Button>
        </div>
      )}
    </div>
  );
}

