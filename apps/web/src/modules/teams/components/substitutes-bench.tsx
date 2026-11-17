import { useFormationStore } from '../store/use-formation-store';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, UserMinus, Plus, Sparkles } from 'lucide-react';
import type { FormationPlayer, MatchAttendance } from '../types';

export interface SubstitutesBenchProps {
  onUnassignPlayer?: (userId: string) => void;
  isRemoving?: boolean;
  unassignedSquadMembers?: MatchAttendance[];
  onDeployToPitch?: (player: FormationPlayer | MatchAttendance) => void;
  isReadOnly?: boolean;
  onPlayerAction?: (player: FormationPlayer, element: HTMLElement) => void;
}

export function SubstitutesBench({
  onUnassignPlayer,
  isRemoving = false,
  unassignedSquadMembers = [],
  onDeployToPitch,
  isReadOnly = false,
  onPlayerAction,
}: SubstitutesBenchProps) {
  const draftPlayers = useFormationStore((s) => s.draftPlayers);
  const selectedBenchUserId = useFormationStore((s) => s.selectedBenchUserId);
  const selectedPitchUserId = useFormationStore((s) => s.selectedPitchUserId);

  const setSelectedBench = useFormationStore((s) => s.setSelectedBench);
  const swapPlayers = useFormationStore((s) => s.swapPlayers);
  const deployPlayerToPitch = useFormationStore((s) => s.deployPlayerToPitch);
  const addPlayerToBench = useFormationStore((s) => s.addPlayerToBench);
  const updatePlayerPosition = useFormationStore((s) => s.updatePlayerPosition);
  const setValidationError = useFormationStore((s) => s.setValidationError);

  const teamHasGoalkeeper = draftPlayers.some(
    (p) => p.positionLabel?.trim().toUpperCase() === 'GK'
  );

  const benchPlayers = draftPlayers.filter((p) => p.isSubstitute);
  const teamDrafts = useFormationStore((s) => s.teamDrafts);
  const selectedTeamId = useFormationStore((s) => s.selectedTeamId);

  // Compute unassigned squad members not in current draft and not in other team drafts
  const assignedInAnyDraft = new Set<string>();
  draftPlayers.forEach((p) => assignedInAnyDraft.add(p.userId));
  Object.keys(teamDrafts).forEach((tId) => {
    if (tId !== selectedTeamId) {
      teamDrafts[tId]?.draftPlayers.forEach((p) => assignedInAnyDraft.add(p.userId));
    }
  });

  const availableSquad = unassignedSquadMembers.filter((m) => !assignedInAnyDraft.has(m.userId));

  const handleBenchPlayerClick = (player: FormationPlayer) => {
    if (isReadOnly) return;
    // If a pitch starter was already clicked, swap immediately!
    if (selectedPitchUserId) {
      swapPlayers(selectedPitchUserId, player.userId);
      return;
    }

    // Toggle bench selection
    if (selectedBenchUserId === player.userId) {
      setSelectedBench(null);
    } else {
      setSelectedBench(player.userId);
    }
  };

  const handleDeploy = (player: FormationPlayer | MatchAttendance) => {
    if (onDeployToPitch) {
      onDeployToPitch(player);
    } else {
      deployPlayerToPitch(player);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">
            Substitutes Bench ({benchPlayers.length})
          </h3>
        </div>

        {selectedBenchUserId && (
          <span className="text-[11px] font-bold text-primary animate-pulse">
            Tap a pitch starter to swap!
          </span>
        )}
      </div>

      {benchPlayers.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg bg-surface-subtle/50">
          <p className="font-semibold text-foreground">No Substitutes on Bench</p>
          <p className="text-[11px] mt-0.5">
            Assign players from the match pool below or toggle active starters to the bench.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {benchPlayers.map((player) => {
            const isSelected = selectedBenchUserId === player.userId;
            const name = player.displayName || 'Sub Player';
            const initials = name
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join('') || 'SUB';

            return (
              <div
                key={player.userId}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/40 shadow-md'
                    : 'border-border bg-surface-subtle/60 hover:bg-surface-subtle'
                }`}
              >
                {/* Player Profile & Info */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={event => onPlayerAction ? onPlayerAction(player, event.currentTarget) : handleBenchPlayerClick(player)}
                  onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (onPlayerAction) onPlayerAction(player, event.currentTarget); else handleBenchPlayerClick(player); } }}
                  aria-haspopup="menu"
                  className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none"
                >
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface border border-border text-xs font-bold text-foreground">
                    {player.avatarUrl ? (
                      <img
                        src={player.avatarUrl}
                        alt={name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                    <span className="absolute -bottom-1 -right-1 text-[8px] font-black bg-surface-subtle text-muted-foreground px-1 py-0.2 rounded border border-border">
                      SUB
                    </span>
                  </div>

                  <div className="truncate min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{name}</p>
                    {!isReadOnly ? (
                      <div className="flex items-center gap-1 mt-1">
                        {(['GK', 'DEF', 'MID', 'ATT', 'SUB'] as const).map((pos) => {
                          const isCurrent = (player.positionLabel || 'SUB').toUpperCase() === pos;
                          const isGkDisabled = pos === 'GK' && !isCurrent && teamHasGoalkeeper;

                          return (
                            <button
                              key={pos}
                              type="button"
                              disabled={isGkDisabled}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isGkDisabled) {
                                  setValidationError(
                                    'This team already has a goalkeeper. Only one goalkeeper is allowed per team.'
                                  );
                                  return;
                                }
                                updatePlayerPosition(player.userId, pos);
                              }}
                              title={
                                isGkDisabled
                                  ? 'This team already has a goalkeeper. Only one goalkeeper is allowed per team.'
                                  : `Set role to ${pos}`
                              }
                              className={`px-1.5 py-0.2 text-[8px] font-bold rounded transition-all ${
                                isCurrent
                                  ? 'bg-primary text-primary-foreground'
                                  : isGkDisabled
                                  ? 'opacity-30 cursor-not-allowed text-muted-foreground'
                                  : 'bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-subtle border border-border/50'
                              }`}
                            >
                              {pos}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-muted-foreground mt-0.5 inline-block">
                        Role: {player.positionLabel || 'SUB'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bench Action Buttons */}
                {!isReadOnly && (
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeploy(player)}
                      title="Promote directly to pitch"
                      className="h-8 px-2 text-[11px] border-border text-foreground hover:bg-surface-subtle"
                    >
                      Deploy
                    </Button>

                    {onUnassignPlayer && (
                      <button
                        type="button"
                        onClick={() => onUnassignPlayer(player.userId)}
                        disabled={isRemoving}
                        title="Unassign from team"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-danger hover:bg-surface-subtle transition-colors"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Available Squad Members / Unassigned Bench Section */}
      {!isReadOnly && availableSquad.length > 0 && (
        <div className="pt-3 border-t border-border/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Available Squad Members / Unassigned Bench ({availableSquad.length})
            </span>
            <span className="text-[10px] text-muted-foreground">
              Ready to deploy to tactical formation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {availableSquad.map((member) => {
              const name =
                member.profile?.displayName || `Player ${member.userId.slice(0, 4)}`;
              const prefPos = member.profile?.preferredPosition || 'MID';
              const initials =
                name
                  .replace(/[^a-zA-Z0-9 ]/g, '')
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase())
                  .join('') || 'SQ';

              return (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface-subtle/60 hover:bg-surface-subtle transition-all"
                >
                  <div role="button" tabIndex={0} aria-haspopup="menu" onClick={event => onPlayerAction?.({ userId: member.userId, teamId: '', displayName: name, avatarUrl: member.profile?.avatarUrl, coordinate: null, positionLabel: 'SUB', isSubstitute: true }, event.currentTarget)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onPlayerAction?.({ userId: member.userId, teamId: '', displayName: name, avatarUrl: member.profile?.avatarUrl, coordinate: null, positionLabel: 'SUB', isSubstitute: true }, event.currentTarget); } }} className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface border border-border text-xs font-bold text-foreground">
                      {member.profile?.avatarUrl ? (
                        <img
                          src={member.profile.avatarUrl}
                          alt={name}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="truncate min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{name}</p>
                      <span className="text-[10px] text-primary font-mono font-bold">
                        {prefPos}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleDeploy(member)}
                      title="Deploy directly to pitch"
                      className="h-7 px-2 text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm"
                    >
                      <Plus className="h-3 w-3 mr-0.5" />
                      Pitch
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addPlayerToBench(member)}
                      title="Add to team bench"
                      className="h-7 px-2 text-[10px] border-border text-foreground hover:bg-surface-subtle"
                    >
                      Bench
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
