import { useState } from 'react';
import { Coins, Check } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import type { CricketGameDetail, CricketSide } from '../types';
import { useRecordToss } from '../api';

export function CricketToss({ game }: { game: CricketGameDetail }) {
  const recordToss = useRecordToss(game.game_id);
  const [winningTeam, setWinningTeam] = useState<CricketSide>(game.toss?.winning_team ?? 'A');
  const [decision, setDecision] = useState<'bat' | 'bowl'>(game.toss?.decision ?? 'bat');
  const [isEditing, setIsEditing] = useState(false);

  const closed = game.status === 'completed' || game.status === 'cancelled';
  const canEdit = game.is_organizer && !closed;

  const handleSave = () => {
    recordToss.mutate(
      { winning_team: winningTeam, decision },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Coins className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Toss Status</h2>
            <p className="text-xs text-muted-foreground">Match opening decision</p>
          </div>
        </div>
        {canEdit && !isEditing && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => setIsEditing(true)}
          >
            {game.toss ? 'Change Toss' : 'Record Toss'}
          </Button>
        )}
      </div>

      {game.toss && !isEditing ? (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              Official Decision
            </p>
            <p className="text-sm font-bold text-foreground mt-0.5">
              Team {game.toss.winning_team} won the toss and elected to{' '}
              <span className="text-primary font-black uppercase">{game.toss.decision}</span> first.
            </p>
          </div>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-4 w-4" />
          </span>
        </div>
      ) : !game.toss && !isEditing ? (
        <p className="text-xs text-muted-foreground py-1">
          The toss has not been recorded yet.
        </p>
      ) : null}

      {isEditing && (
        <div className="space-y-3 border-t border-border pt-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Toss Winner
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={winningTeam === 'A' ? 'default' : 'outline'}
                onClick={() => setWinningTeam('A')}
                className="font-bold text-xs"
              >
                Team A Won
              </Button>
              <Button
                type="button"
                size="sm"
                variant={winningTeam === 'B' ? 'default' : 'outline'}
                onClick={() => setWinningTeam('B')}
                className="font-bold text-xs"
              >
                Team B Won
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Decision
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={decision === 'bat' ? 'default' : 'outline'}
                onClick={() => setDecision('bat')}
                className="font-bold text-xs"
              >
                Elected to Bat
              </Button>
              <Button
                type="button"
                size="sm"
                variant={decision === 'bowl' ? 'default' : 'outline'}
                onClick={() => setDecision('bowl')}
                className="font-bold text-xs"
              >
                Elected to Bowl
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={recordToss.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              isLoading={recordToss.isPending}
              className="bg-primary text-primary-foreground font-bold"
            >
              Save Toss Result
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

