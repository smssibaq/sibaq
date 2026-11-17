import { useFormationStore } from '../store/use-formation-store';
import { FORMATION_PRESETS } from '../presets';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw, Sparkles, Check, Lock } from 'lucide-react';
import type { Team, MatchAttendance } from '../types';

export interface FormationToolbarProps {
  teams: Team[];
  onSave: () => void;
  isSaving: boolean;
  onAutoFillSquad?: () => void;
  squadPlayerCount?: number;
  squadPlayers?: MatchAttendance[];
  isReadOnly?: boolean;
}

export function FormationToolbar({
  teams,
  onSave,
  isSaving,
  onAutoFillSquad,
  squadPlayerCount = 0,
  squadPlayers,
  isReadOnly = false,
}: FormationToolbarProps) {
  const selectedTeamId = useFormationStore((s) => s.selectedTeamId);
  const selectedFormat = useFormationStore((s) => s.selectedFormat);
  const formationName = useFormationStore((s) => s.formationName);
  const baseRevision = useFormationStore((s) => s.baseRevision);
  const isDirty = useFormationStore((s) => s.isDirty);
  const draftPlayers = useFormationStore((s) => s.draftPlayers);

  const setSelectedTeamId = useFormationStore((s) => s.setSelectedTeamId);
  const applyFormationPreset = useFormationStore((s) => s.applyFormationPreset);
  const resetDraft = useFormationStore((s) => s.resetDraft);

  const startersCount = draftPlayers.filter((p) => !p.isSubstitute && p.coordinate !== null).length;
  const targetStarters = selectedFormat === '5v5' ? 5 : selectedFormat === '6v6' ? 6 : 7;

  // Filter presets strictly by the locked match format
  const activePresets = FORMATION_PRESETS.filter((p) => p.format === selectedFormat);

  return (
    <div className="space-y-4 mb-6">
      {/* Top Bar: Team Switcher & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-surface shadow-card">
        {/* Team Tabs Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {teams.map((team) => {
            const isSelected = selectedTeamId === team.id;
            const teamStarters = (team.players || []).filter((p) => !p.isSubstitute).length;

            return (
              <button
                key={team.id}
                type="button"
                onClick={() => setSelectedTeamId(team.id, team, squadPlayers)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-surface-subtle text-foreground hover:bg-surface-subtle/80 border border-border'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full border border-black/30"
                  style={{ backgroundColor: team.color || '#B7F34B' }}
                />
                <span>{team.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isSelected ? 'bg-black/20 text-primary-foreground' : 'bg-surface text-muted-foreground border border-border/50'
                  }`}
                >
                  {teamStarters} on pitch
                </span>
              </button>
            );
          })}
        </div>

        {/* Save & Reset Action Controls */}
        <div className="flex items-center gap-2">
          {!isReadOnly && onAutoFillSquad && squadPlayerCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAutoFillSquad}
              className="text-xs border-primary/50 text-primary hover:bg-primary/10 font-bold"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              <span>Auto-Fill Squad ({squadPlayerCount})</span>
            </Button>
          )}

          {!isReadOnly && isDirty && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetDraft}
              disabled={isSaving}
              className="text-xs border-border text-foreground hover:bg-surface-subtle"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              <span>Reset</span>
            </Button>
          )}

          {isReadOnly ? (
            <Button
              type="button"
              size="sm"
              disabled
              title="Viewing Mode: Only squad owners and administrators can save lineups"
              className="text-xs font-bold opacity-60 cursor-not-allowed bg-surface-subtle text-muted-foreground border border-border"
            >
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              <span>Viewing Mode</span>
              <Badge variant="secondary" className="ml-2 bg-black/20 text-inherit text-[10px]">
                Rev {baseRevision}
              </Badge>
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              isLoading={isSaving}
              className={`text-xs font-bold transition-all ${
                isDirty
                  ? 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-md animate-pulse'
                  : 'bg-surface-subtle text-foreground hover:bg-surface-subtle/80 border border-border'
              }`}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              <span>Save Lineup</span>
              {isDirty && (
                <span className="ml-1.5 h-2 w-2 rounded-full bg-current inline-block animate-ping" />
              )}
              <Badge variant="secondary" className="ml-2 bg-black/20 text-inherit text-[10px]">
                Rev {baseRevision}
              </Badge>
            </Button>
          )}
        </div>
      </div>

      {/* Format & Preset Pills Sub-Bar */}
      <div className="p-3 sm:p-3.5 rounded-xl border border-border bg-surface/90 shadow-card space-y-2.5 sm:space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          {/* Match Level Indicator (Locked strictly to match fixture format) */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Match Format:
            </span>
            <Badge
              variant="outline"
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-bold bg-primary/10 text-primary border-primary/30 font-mono whitespace-nowrap"
            >
              {selectedFormat} Fixture ({targetStarters}v{targetStarters})
            </Badge>
          </div>

          {/* Starters Count Status Pill */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">Pitch Starters:</span>
            <Badge
              variant={startersCount === targetStarters ? 'success' : startersCount > targetStarters ? 'danger' : 'warning'}
              className="text-[10px] sm:text-xs font-mono font-bold whitespace-nowrap"
            >
              {startersCount}/{targetStarters} Selected
            </Badge>
          </div>
        </div>

        {/* Formation Preset Pills (Strictly filtered to match level) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
          <div className="flex items-center gap-1 text-[11px] font-bold text-primary mr-2">
            <Sparkles className="h-3 w-3" />
            <span>Tactical Shapes:</span>
          </div>

          {activePresets.map((preset) => {
            const isCurrent = formationName === preset.name;

            return (
              <button
                key={preset.id}
                type="button"
                disabled={isReadOnly}
                onClick={() => applyFormationPreset(preset)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isCurrent
                    ? 'bg-primary/15 text-primary border border-primary/40 shadow-sm font-semibold'
                    : isReadOnly
                    ? 'bg-surface-subtle text-muted-foreground border border-border cursor-not-allowed opacity-75'
                    : 'bg-surface-subtle text-foreground hover:bg-surface-subtle/80 border border-border'
                }`}
              >
                {isCurrent && <Check className="h-3 w-3 text-primary" />}
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
