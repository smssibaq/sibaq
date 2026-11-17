import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/page-header';
import { LoadingState } from '@/components/common/loading-state';
import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { TacticalPitch } from './tactical-pitch';
import { FormationToolbar } from './formation-toolbar';
import { SubstitutesBench } from './substitutes-bench';
import { TeamAssignmentPanel } from './team-assignment-panel';
import {
  useTeamLineup,
  useSaveFormationMutation,
  useAssignPlayerMutation,
  useRemovePlayerMutation,
} from '../hooks/use-team-lineup';
import { useLineupRealtime } from '../hooks/use-lineup-realtime';
import { useFormationStore } from '../store/use-formation-store';
import { useAuth } from '@/modules/auth/auth-provider';
import { squadApi } from '@/modules/squads/api';
import type { PitchCoordinate } from '../types';
import { ArrowLeft, ShieldCheck, Sparkles, AlertCircle, ShieldAlert } from 'lucide-react';

export function LineupEditorPage() {
  // Extract matchId from URL path: /matches/:matchId/lineup
  const pathParts = window.location.pathname.split('/');
  const matchIdIndex = pathParts.indexOf('matches');
  const matchId = matchIdIndex !== -1 && pathParts[matchIdIndex + 1] ? pathParts[matchIdIndex + 1] : '';

  const { toast } = useToast();
  const { user, role: appRole } = useAuth();

  // TanStack Query & Mutation Hooks
  const { match, teams, confirmedPlayers, isLoading, isError, error, refetch } = useTeamLineup(matchId);
  const saveMutation = useSaveFormationMutation(matchId);
  const assignMutation = useAssignPlayerMutation(matchId);
  const removeMutation = useRemovePlayerMutation(matchId);

  // Realtime live synchronization
  useLineupRealtime({ matchId, enabled: Boolean(matchId) });

  // Check squad membership & manager authorization
  const { data: squadDetail } = useQuery({
    queryKey: ['squads', match?.squadId, 'detail'],
    queryFn: () => (match?.squadId ? squadApi.getSquadDetail(match.squadId) : null),
    enabled: Boolean(match?.squadId),
  });

  const isManager = Boolean(
    appRole === 'admin' ||
      squadDetail?.canManage ||
      (user &&
        squadDetail &&
        (squadDetail.ownerId === user.id || squadDetail.role === 'owner' || squadDetail.role === 'admin'))
  );

  // Zustand Store
  const selectedTeamId = useFormationStore((s) => s.selectedTeamId);
  const hydrateFromServer = useFormationStore((s) => s.hydrateFromServer);
  const isDirty = useFormationStore((s) => s.isDirty);
  const formationName = useFormationStore((s) => s.formationName);
  const baseRevision = useFormationStore((s) => s.baseRevision);
  const draftPlayers = useFormationStore((s) => s.draftPlayers);
  const validationError = useFormationStore((s) => s.validationError);
  const clearValidationError = useFormationStore((s) => s.clearValidationError);

  // Find active team
  const activeTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];

  // Stable primitive hashes for dependencies to prevent infinite re-render loops
  const activeTeamId = activeTeam?.id || '';
  const teamRevision = activeTeam?.revision || 1;
  const teamPlayersHash = JSON.stringify(
    (activeTeam?.players || []).map((p) => ({
      u: p.userId,
      s: p.isSubstitute,
      x: p.coordinate?.x,
      y: p.coordinate?.y,
      l: p.positionLabel,
    }))
  );
  const confirmedPlayersHash = JSON.stringify(confirmedPlayers.map((p) => p.userId));
  const playersPerTeam = match?.playersPerTeam;

  const lastHydratedKeyRef = useRef<string>('');
  const lastMatchIdRef = useRef<string>('');

  // Reset store drafts when switching between matches
  useEffect(() => {
    if (matchId && lastMatchIdRef.current !== matchId) {
      lastMatchIdRef.current = matchId;
      lastHydratedKeyRef.current = '';
      useFormationStore.setState({
        selectedTeamId: null,
        matchPlayersPerTeam: undefined,
        teamDrafts: {},
        draftPlayers: [],
        serverPlayers: [],
        isDirty: false,
        validationError: null,
      });
    }
  }, [matchId]);

  // Auto-hydrate when match and active team data are loaded
  useEffect(() => {
    if (isLoading || !match || !activeTeam) return;

    const currentKey = `${matchId}:${activeTeamId}:${teamRevision}:${teamPlayersHash}:${confirmedPlayersHash}:${playersPerTeam}`;
    
    // Check if store format is uninitialized or mismatches the fixture format
    const storePlayersPerTeam = useFormationStore.getState().matchPlayersPerTeam;
    const isFormatMismatched =
      storePlayersPerTeam === undefined ||
      storePlayersPerTeam !== playersPerTeam;

    if ((!isDirty || isFormatMismatched) && lastHydratedKeyRef.current !== currentKey) {
      lastHydratedKeyRef.current = currentKey;
      hydrateFromServer(activeTeam, playersPerTeam, confirmedPlayers);
    }
  }, [
    isLoading,
    match,
    matchId,
    activeTeamId,
    teamRevision,
    teamPlayersHash,
    confirmedPlayersHash,
    playersPerTeam,
    isDirty,
    activeTeam,
    confirmedPlayers,
    hydrateFromServer,
  ]);

  // Strict Team Membership Isolation: Track players assigned to other teams
  const otherTeamsAssignedUserIds = useMemo(() => {
    const set = new Set<string>();
    teams
      .filter((t) => t.id !== activeTeamId)
      .forEach((t) => {
        (t.players || []).forEach((p) => set.add(p.userId));
      });

    // Also check other teams' drafts
    const drafts = useFormationStore.getState().teamDrafts;
    Object.keys(drafts).forEach((tId) => {
      if (tId !== activeTeamId) {
        drafts[tId]?.draftPlayers.forEach((p) => set.add(p.userId));
      }
    });

    return set;
  }, [teams, activeTeamId]);

  // Squad players available to be assigned to this team (not in other teams)
  const availableToAssign = useMemo(() => {
    return confirmedPlayers.filter((cp) => !otherTeamsAssignedUserIds.has(cp.userId));
  }, [confirmedPlayers, otherTeamsAssignedUserIds]);

  // Handle Manual 1-click Auto-Fill Squad Action (strictly populates unassigned players by preference)
  const handleAutoFillSquad = useCallback(() => {
    if (!activeTeam || availableToAssign.length === 0) return;
    useFormationStore.getState().autoFillSquad(availableToAssign);
  }, [activeTeam, availableToAssign]);

  // Handle Save
  const handleSave = useCallback(async () => {
    if (!activeTeam) return;

    if (!isManager) {
      toast.error(
        'Permission Denied',
        'Only squad owners and administrators are authorized to save match formations.'
      );
      return;
    }

    const currentDraft = useFormationStore.getState().draftPlayers;
    const currentFormation = useFormationStore.getState().formationName;
    const currentRevision = useFormationStore.getState().baseRevision;

    const positions = currentDraft.map((p) => ({
      userId: p.userId,
      positionLabel: p.positionLabel,
      isSubstitute: p.isSubstitute,
      pitchX: p.coordinate ? p.coordinate.x : null,
      pitchY: p.coordinate ? p.coordinate.y : null,
    }));

    await saveMutation.mutateAsync({
      teamId: activeTeam.id,
      formation: currentFormation,
      expectedRevision: currentRevision,
      positions,
    });
  }, [activeTeam, isManager, saveMutation, toast]);

  // Handle Player Assignment (assigned as substitute first to bypass coordinate check)
  const handleAssignPlayer = useCallback(
    async (
      teamId: string,
      userId: string,
      position = 'SUB',
      isSubstitute = true,
      coordinate: PitchCoordinate | null = null
    ) => {
      // Remove from any other team drafts immediately
      useFormationStore.getState().removePlayerFromOtherDrafts(userId, teamId);
      await assignMutation.mutateAsync({ teamId, userId, position, isSubstitute, coordinate });
    },
    [assignMutation]
  );

  // Handle Player Removal
  const handleRemovePlayer = useCallback(
    async (userId: string) => {
      useFormationStore.getState().removePlayerFromOtherDrafts(userId, '');
      const state = useFormationStore.getState();
      useFormationStore.setState({
        draftPlayers: state.draftPlayers.filter((p) => p.userId !== userId),
      });
      await removeMutation.mutateAsync(userId);
    },
    [removeMutation]
  );

  if (isLoading) {
    return (
      <LoadingState message="Deploying tactical turf pitch & syncing lineup..." />
    );
  }

  if (isError || !match) {
    return (
      <div className="py-12">
        <ErrorState
          title="Unable to Load Lineup"
          message={error instanceof Error ? error.message : 'Match or team records could not be retrieved.'}
          onRetry={refetch}
        />
      </div>
    );
  }

  const startersCount = draftPlayers.filter((p) => !p.isSubstitute && p.coordinate !== null).length;
  const subsCount = draftPlayers.filter((p) => p.isSubstitute).length;

  return (
    <div className="space-y-6">
      {/* View Header */}
      <PageHeader
        title={match.title ? `${match.title} — Lineup Editor` : 'eFootball Tactical Lineup'}
        description={`Interactive tactile formation board for ${activeTeam?.name || 'Match Teams'} at ${match.turfName}.`}
        badge={match.mode === 'friendly' ? 'Friendly (2 Teams)' : 'Single Squad'}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = `/matches/${matchId}`)}
              className="border-border text-foreground hover:bg-surface-subtle"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span>Back to Match</span>
            </Button>
          </div>
        }
      />

      {/* Permission Mode Banner for Ordinary Players */}
      {!isManager && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-primary/40 bg-primary/10 text-foreground text-xs shadow-sm">
          <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
          <span>
            <strong>Viewing Mode:</strong> You are viewing the live match tactical board. Only squad captains and administrators are authorized to modify formations and save lineups.
          </span>
        </div>
      )}

      {/* Main Formation Toolbar */}
      <FormationToolbar
        teams={teams}
        onSave={handleSave}
        isSaving={saveMutation.isPending}
        onAutoFillSquad={handleAutoFillSquad}
        squadPlayerCount={confirmedPlayers.length}
        squadPlayers={confirmedPlayers}
        isReadOnly={!isManager}
      />

      {/* Validation Message Banner (Goalkeeper & Tactical rules) */}
      {Boolean(validationError || saveMutation.error || assignMutation.error) && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-warning/50 bg-warning/10 text-warning text-xs font-semibold shadow-md animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
            <span>
              {validationError ||
                (saveMutation.error instanceof Error
                  ? saveMutation.error.message
                  : assignMutation.error instanceof Error
                  ? assignMutation.error.message
                  : 'Action could not be completed.')}
            </span>
          </div>
          <button
            type="button"
            onClick={clearValidationError}
            className="p-1 hover:bg-warning/20 rounded text-warning/80 hover:text-warning"
          >
            ✕
          </button>
        </div>
      )}

      {/* Split Tactical Pitch & Squad Management Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-12">
        {/* Left Column (8 cols): Interactive Football Pitch & Substitutes Bench */}
        <div className="lg:col-span-8 space-y-6">
          <TacticalPitch
            teamColor={activeTeam?.color || '#B7F34B'}
            isReadOnly={!isManager}
          />

          <SubstitutesBench
            onUnassignPlayer={handleRemovePlayer}
            isRemoving={removeMutation.isPending}
            unassignedSquadMembers={availableToAssign}
            isReadOnly={!isManager}
          />
        </div>

        {/* Right Column (4 cols): Team Summary Card & Match Attendees Pool */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Team Tactical Summary Card */}
          <Card className="border-border bg-surface shadow-card">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full border border-black/30 shadow-sm"
                    style={{ backgroundColor: activeTeam?.color || '#B7F34B' }}
                  />
                  <CardTitle className="text-base font-bold text-foreground">
                    {activeTeam?.name} Summary
                  </CardTitle>
                </div>
                <Badge variant="outline" className="border-border text-[10px] text-primary font-mono font-bold">
                  Rev {baseRevision}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between text-xs py-1 border-b border-border/60">
                <span className="text-muted-foreground">Active Tactical Shape:</span>
                <span className="font-bold text-foreground">{formationName}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-b border-border/60">
                <span className="text-muted-foreground">On-Pitch Starters:</span>
                <span className="font-bold text-primary">{startersCount} Players</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-b border-border/60">
                <span className="text-muted-foreground">Bench Substitutes:</span>
                <span className="font-bold text-foreground">{subsCount} Players</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-muted-foreground">Tactical Status:</span>
                {isDirty ? (
                  <span className="inline-flex items-center gap-1 text-warning font-bold">
                    <Sparkles className="h-3 w-3" />
                    Unsaved Edits
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-success font-bold">
                    <ShieldCheck className="h-3 w-3" />
                    Synced Live
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Confirmed Match Attendees -> Team Assignment Pool */}
          <TeamAssignmentPanel
            teams={teams}
            confirmedAttendance={confirmedPlayers}
            onAssignPlayer={handleAssignPlayer}
            isAssigning={assignMutation.isPending}
            isReadOnly={!isManager}
          />
        </div>
      </div>
    </div>
  );
}
