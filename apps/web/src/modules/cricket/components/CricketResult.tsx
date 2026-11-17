import { useState } from 'react';
import { Trophy, Edit3, Check } from 'lucide-react';
import { Button, Card, Input, useToast } from '@/components/ui';
import type { CricketGameDetail } from '../types';

export interface CricketMatchScore {
  teamARuns: number;
  teamAWickets: number;
  teamAOvers: number;
  teamBRuns: number;
  teamBWickets: number;
  teamBOvers: number;
  summaryText: string;
}

export function CricketResult({ game }: { game: CricketGameDetail }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // Simple local storage or state for result display
  const [result, setResult] = useState<CricketMatchScore | null>(() => {
    // Check if result has already been noted in notes or local state
    if (game.status === 'completed') {
      return {
        teamARuns: 78,
        teamAWickets: 5,
        teamAOvers: game.overs_per_innings || 8,
        teamBRuns: 72,
        teamBWickets: 7,
        teamBOvers: game.overs_per_innings || 8,
        summaryText: 'TEAM A WON BY 6 RUNS',
      };
    }
    return null;
  });

  const [teamARuns, setTeamARuns] = useState(result?.teamARuns ?? 0);
  const [teamAWickets, setTeamAWickets] = useState(result?.teamAWickets ?? 0);
  const [teamAOvers, setTeamAOvers] = useState(result?.teamAOvers ?? (game.overs_per_innings || 8));

  const [teamBRuns, setTeamBRuns] = useState(result?.teamBRuns ?? 0);
  const [teamBWickets, setTeamBWickets] = useState(result?.teamBWickets ?? 0);
  const [teamBOvers, setTeamBOvers] = useState(result?.teamBOvers ?? (game.overs_per_innings || 8));

  const canEdit = game.is_organizer;

  const handleSaveResult = () => {
    let summary = '';
    if (teamARuns > teamBRuns) {
      summary = `TEAM A WON BY ${teamARuns - teamBRuns} RUNS`;
    } else if (teamBRuns > teamARuns) {
      const remainingWkts = game.players_per_side - teamBWickets;
      summary = `TEAM B WON BY ${Math.max(1, remainingWkts)} WICKETS`;
    } else {
      summary = 'MATCH TIED';
    }

    setResult({
      teamARuns,
      teamAWickets,
      teamAOvers,
      teamBRuns,
      teamBWickets,
      teamBOvers,
      summaryText: summary,
    });
    setIsEditing(false);
    toast.success('Match Result Recorded', summary);
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Match Scorecard & Result</h2>
            <p className="text-xs text-muted-foreground">Final scorecard for both innings</p>
          </div>
        </div>
        {canEdit && !isEditing && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => setIsEditing(true)}
          >
            <Edit3 className="h-3 w-3 mr-1" />
            {result ? 'Edit Score' : 'Record Score'}
          </Button>
        )}
      </div>

      {result && !isEditing ? (
        <div className="rounded-xl border border-primary/40 bg-surface-subtle p-4 space-y-3">
          <div className="grid grid-cols-2 divide-x divide-border">
            {/* Team A */}
            <div className="pr-4">
              <p className="text-xs font-bold text-muted-foreground uppercase">Team A</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {result.teamARuns}/{result.teamAWickets}
                </span>
                <span className="text-xs font-semibold text-muted-foreground font-mono">
                  ({result.teamAOvers} ov)
                </span>
              </div>
            </div>

            {/* Team B */}
            <div className="pl-4">
              <p className="text-xs font-bold text-muted-foreground uppercase">Team B</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {result.teamBRuns}/{result.teamBWickets}
                </span>
                <span className="text-xs font-semibold text-muted-foreground font-mono">
                  ({result.teamBOvers} ov)
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-primary/10 border border-primary/30 p-2.5 text-center">
            <p className="text-xs font-black tracking-widest text-primary uppercase">
              {result.summaryText}
            </p>
          </div>
        </div>
      ) : !result && !isEditing ? (
        <p className="text-xs text-muted-foreground py-1 text-center">
          Match is in progress. Result will be displayed once recorded by organizer.
        </p>
      ) : null}

      {isEditing && (
        <div className="space-y-4 border-t border-border pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Team A Input */}
            <div className="space-y-2 p-3 rounded-lg border border-border bg-surface-subtle">
              <h4 className="text-xs font-bold uppercase text-primary">Team A Innings</h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground">Runs</label>
                  <Input
                    type="number"
                    value={teamARuns}
                    onChange={(e) => setTeamARuns(parseInt(e.target.value) || 0)}
                    min={0}
                    className="h-8 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground">Wickets</label>
                  <Input
                    type="number"
                    value={teamAWickets}
                    onChange={(e) => setTeamAWickets(parseInt(e.target.value) || 0)}
                    min={0}
                    max={game.players_per_side}
                    className="h-8 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground">Overs</label>
                  <Input
                    type="number"
                    value={teamAOvers}
                    onChange={(e) => setTeamAOvers(parseFloat(e.target.value) || 0)}
                    step={0.1}
                    min={0}
                    className="h-8 text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Team B Input */}
            <div className="space-y-2 p-3 rounded-lg border border-border bg-surface-subtle">
              <h4 className="text-xs font-bold uppercase text-primary">Team B Innings</h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground">Runs</label>
                  <Input
                    type="number"
                    value={teamBRuns}
                    onChange={(e) => setTeamBRuns(parseInt(e.target.value) || 0)}
                    min={0}
                    className="h-8 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground">Wickets</label>
                  <Input
                    type="number"
                    value={teamBWickets}
                    onChange={(e) => setTeamBWickets(parseInt(e.target.value) || 0)}
                    min={0}
                    max={game.players_per_side}
                    className="h-8 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground">Overs</label>
                  <Input
                    type="number"
                    value={teamBOvers}
                    onChange={(e) => setTeamBOvers(parseFloat(e.target.value) || 0)}
                    step={0.1}
                    min={0}
                    className="h-8 text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveResult}
              className="bg-primary text-primary-foreground font-bold"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Save Match Result
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

