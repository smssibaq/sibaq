import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
} from '../hooks/use-team-lineup';
import { useLineupRealtime } from '../hooks/use-lineup-realtime';
import { useFormationStore } from '../store/use-formation-store';
import { useAuth } from '@/modules/auth/auth-provider';
import { squadApi } from '@/modules/squads/api';
import type { FormationPlayer } from '../types';
import { attendanceApi } from '@/modules/attendance/api';
import { queryKeys } from '@/infrastructure/query-keys';
import { normalizeError } from '@/lib/errors';
import { PlayerActionMenu } from '@/components/ui/player-action-menu';
import { moveFootballPlayer, type FootballDrafts } from '../hooks/football-player-actions';
import { createPortal } from 'react-dom';
import { useLineupDrag } from '@/components/lineup/use-lineup-drag';
import { saveFootballLineups } from '../hooks/save-football-lineups';
import { ArrowLeft, ShieldCheck, Sparkles, AlertCircle, ShieldAlert } from 'lucide-react';

export function LineupEditorPage() {
  // Extract matchId from URL path: /matches/:matchId/lineup
  const pathParts = window.location.pathname.split('/');
  const matchIdIndex = pathParts.indexOf('matches');
  const matchId = matchIdIndex !== -1 && pathParts[matchIdIndex + 1] ? pathParts[matchIdIndex + 1] : '';

  const { toast } = useToast();
  const { user, role: appRole } = useAuth();

  // TanStack Query & Mutation Hooks
  const { match, teams: serverTeams, confirmedPlayers, isLoading, isError, error, refetch } = useTeamLineup(matchId);
  const queryClient = useQueryClient();
  const [menuPlayer, setMenuPlayer] = useState<FormationPlayer | null>(null);
  const [menuAnchor, setMenuAnchor] = useState({ left: 12, top: 12 });
  const { data: attendance = [] } = useQuery({ queryKey: queryKeys.matches.attendance(matchId), queryFn: () => attendanceApi.listAttendance(matchId), enabled: Boolean(matchId) });
  const saveMutation = useMutation({
    mutationFn: (drafts: FootballDrafts) => saveFootballLineups(matchId, drafts),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.teams.byMatch(matchId) });
      lastHydratedKeyRef.current = '';
      useFormationStore.setState({ isDirty: false, teamDrafts: {}, validationError: null });
      toast.success('Lineup saved', 'Both teams and benches are saved.');
    },
    onError: error => toast.error('Could not save lineup', normalizeError(error).message),
  });

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

  const teamDrafts = useFormationStore(s => s.teamDrafts);
  const teams = useMemo(() => serverTeams.map(team => ({ ...team, players: team.id === selectedTeamId ? draftPlayers : teamDrafts[team.id]?.draftPlayers ?? team.players })), [serverTeams, selectedTeamId, draftPlayers, teamDrafts]);

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
      hydrateFromServer(serverTeams.find(t => t.id === activeTeam.id) ?? activeTeam, playersPerTeam, confirmedPlayers);
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
    serverTeams,
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

  function captureDrafts(): FootballDrafts {
    const current = useFormationStore.getState();
    return Object.fromEntries(serverTeams.map(team => {
      const draft = current.teamDrafts[team.id];
      return [team.id, team.id === current.selectedTeamId
        ? { players: current.draftPlayers, formation: current.formationName, revision: current.baseRevision }
        : { players: draft?.draftPlayers ?? team.players ?? [], formation: draft?.formationName ?? team.formation, revision: draft?.baseRevision ?? team.revision }];
    }));
  }
  function updateDrafts(next: FootballDrafts, targetId?: string) {
    const current = useFormationStore.getState();
    const selectedId = targetId ?? current.selectedTeamId ?? serverTeams[0]?.id;
    if (!selectedId || !next[selectedId]) return;
    const preserved = Object.fromEntries(Object.entries(next).map(([id, draft]) => [id, { draftPlayers: draft.players, formationName: draft.formation, baseRevision: draft.revision, isDirty: true, selectedFormat: current.selectedFormat }]));
    useFormationStore.setState({ teamDrafts: preserved, selectedTeamId: selectedId, draftPlayers: next[selectedId].players, formationName: next[selectedId].formation, baseRevision: next[selectedId].revision, isDirty: true, selectedPitchUserId: null, selectedBenchUserId: null });
  }
  const lineupDrag = useLineupDrag((id, x, y) => {
    if (!isManager || !match || saveMutation.isPending) return;
    const element = document.elementFromPoint(x,y);
    const zone = element?.closest<HTMLElement>('[data-lineup-zone]');
    const target = zone?.dataset.lineupZone;
    const drafts = captureDrafts();
    const player = Object.values(drafts).flatMap(d => d.players).find(p => p.userId === id);
    if (!player || !target || !confirmedPlayers.some(p => p.userId === id)) { toast.error('Invalid drop','Drop on a pitch, team tab or bench.'); return; }
    try {
      const next = moveFootballPlayer(drafts,player,target,serverTeams,match.playersPerTeam);
      const pitch = element?.closest<HTMLElement>('[data-lineup-pitch]');
      if (pitch && target !== 'bench') {
        const rect = pitch.getBoundingClientRect();
        next[target].players = next[target].players.map(p => p.userId === id ? { ...p, coordinate: { x: Math.max(6,Math.min(94,(x-rect.left)/rect.width*100)), y: Math.max(6,Math.min(94,(y-rect.top)/rect.height*100)) } } : p);
      }
      updateDrafts(next,target === 'bench' ? undefined : target); setMenuPlayer(null);
    } catch(error) { toast.error('Cannot drop player',normalizeError(error).message); }
  });
  function shuffleTeams() {
    if (!isManager || !match || saveMutation.isPending) return;
    const ids = confirmedPlayers.map(p => p.userId);
    for(let i=ids.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [ids[i],ids[j]]=[ids[j],ids[i]]; }
    let next = captureDrafts(); for(const id of Object.keys(next)) next[id]={ ...next[id],players: [] };
    for(let index=0;index<ids.length;index++) {
      const attendee=confirmedPlayers.find(p=>p.userId===ids[index])!;
      const team=serverTeams[Math.floor(index/match.playersPerTeam)] ?? serverTeams[0];
      if(!team) continue;
      const player: FormationPlayer={ userId: attendee.userId,teamId:team.id,displayName:attendee.profile?.displayName,avatarUrl:attendee.profile?.avatarUrl,positionLabel:'SUB',isSubstitute:true,coordinate:null };
      next=moveFootballPlayer(next,player,index<serverTeams.length*match.playersPerTeam?team.id:'bench',serverTeams,match.playersPerTeam);
    }
    updateDrafts(next);
  }
  function openPlayerMenu(player: FormationPlayer, element: HTMLElement) {
    if (!isManager || saveMutation.isPending || lineupDrag.suppressClick()) return;
    const rect = element.getBoundingClientRect();
    setMenuAnchor({ left: rect.left, top: rect.bottom + 6 }); setMenuPlayer(player);
  }
  function movePlayer(player: FormationPlayer, target: string) {
    if (!isManager || !match || saveMutation.isPending) return;
    if (!confirmedPlayers.some(p => p.userId === player.userId)) { toast.error('RSVP required', 'Only Playing players can join active teams.'); return; }
    try {
      updateDrafts(moveFootballPlayer(captureDrafts(), player, target, serverTeams, match.playersPerTeam), target === 'bench' || target === 'remove' ? undefined : target);
      setMenuPlayer(null);
    } catch (error) { toast.error('Cannot move player', normalizeError(error).message); }
  }
  async function handleSave() {
    if (!isManager || !match || saveMutation.isPending) return;
    const drafts = captureDrafts();
    const eligible = new Set(confirmedPlayers.map(p => p.userId));
    for (const draft of Object.values(drafts)) draft.players = draft.players.filter(p => eligible.has(p.userId));
    try { await saveMutation.mutateAsync(drafts); } catch { /* Mutation displays the error and preserves drafts. */ }
  }
  function handleAssignPlayer(teamId: string, userId: string) {
    const attendee = confirmedPlayers.find(p => p.userId === userId);
    if (!attendee) return;
    movePlayer({ userId, teamId: activeTeamId, displayName: attendee.profile?.displayName, avatarUrl: attendee.profile?.avatarUrl, coordinate: null, positionLabel: 'SUB', isSubstitute: true }, teamId);
  }
  function handleRemovePlayer(userId: string) {
    const player = draftPlayers.find(p => p.userId === userId);
    if (player) movePlayer(player, 'remove');
  }
  // Attendance invalidation removes only ineligible assignments, keeping all other local edits.
  const eligibilityKey = JSON.stringify(confirmedPlayers.map(p => p.userId).sort());
  useEffect(() => {
    if (isLoading) return;
    const eligible = new Set<string>(JSON.parse(eligibilityKey));
    const current = useFormationStore.getState();
    const invalid = current.draftPlayers.some(p => !eligible.has(p.userId)) || Object.values(current.teamDrafts).some(d => d.draftPlayers.some(p => !eligible.has(p.userId)));
    if (invalid) useFormationStore.setState({ draftPlayers: current.draftPlayers.filter(p => eligible.has(p.userId)), teamDrafts: Object.fromEntries(Object.entries(current.teamDrafts).map(([id, d]) => [id, { ...d, draftPlayers: d.draftPlayers.filter(p => eligible.has(p.userId)) }])), isDirty: isManager || current.isDirty });
  }, [eligibilityKey, isLoading, isManager]);

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

      {attendance.some(p => p.status === 'maybe') && <Card className="p-4 space-y-2"><h3 className="text-sm font-bold">Provisional bench ? Maybe</h3>{attendance.filter(p => p.status === 'maybe').map(p => <button type="button" key={p.userId} disabled={!isManager} onClick={event => openPlayerMenu({ userId: p.userId, teamId: activeTeamId, displayName: p.profile?.displayName, avatarUrl: p.profile?.avatarUrl, coordinate: null, positionLabel: 'SUB', isSubstitute: true }, event.currentTarget)} className="flex min-h-11 w-full items-center justify-between rounded-lg border border-border px-3 text-sm"><span>{p.profile?.displayName || 'Player'}</span><Badge variant="warning">Maybe</Badge></button>)}</Card>}
      {menuPlayer && isManager && <PlayerActionMenu anchor={menuAnchor} name={menuPlayer.displayName || 'Player'} hasTeamB={serverTeams.length > 1} current={!menuPlayer.teamId ? null : menuPlayer.isSubstitute ? 'bench' : serverTeams[0]?.id === menuPlayer.teamId ? 'A' : 'B'} maybe={!confirmedPlayers.some(p => p.userId === menuPlayer.userId)} disabled={saveMutation.isPending} canMove={target => {
        if (!confirmedPlayers.some(p => p.userId === menuPlayer.userId)) return target === 'bench';
        if (target === 'bench' || target === 'remove') return true;
        const team = serverTeams[target === 'A' ? 0 : 1];
        if (!team || !match) return false;
        try { moveFootballPlayer(captureDrafts(), menuPlayer, team.id, serverTeams, match.playersPerTeam); return true; } catch { return false; }
      }} onMove={target => { if (target === 'bench' && !confirmedPlayers.some(p => p.userId === menuPlayer.userId)) { setMenuPlayer(null); return; } const team = serverTeams[target === 'A' ? 0 : 1]; movePlayer(menuPlayer, target === 'bench' || target === 'remove' ? target : team?.id ?? ''); }} onClose={() => setMenuPlayer(null)} />}

      {lineupDrag.drag && createPortal(<div aria-hidden="true" className="pointer-events-none fixed z-[70] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-primary bg-surface p-3 text-xs" style={{ left:lineupDrag.drag.x,top:lineupDrag.drag.y }}>Moving player</div>,document.body)}
      {isManager && <Button variant="outline" size="sm" disabled={saveMutation.isPending} onClick={shuffleTeams}>Shuffle teams</Button>}
      {/* Main Formation Toolbar */}
      <FormationToolbar
        teams={teams}
        onReset={() => { lastHydratedKeyRef.current = ''; useFormationStore.setState({ teamDrafts: {}, isDirty: false }); }}
        onSave={handleSave}
        isSaving={saveMutation.isPending}
        onAutoFillSquad={handleAutoFillSquad}
        squadPlayerCount={confirmedPlayers.length}
        squadPlayers={confirmedPlayers}
        isReadOnly={!isManager}
      />

      {/* Validation Message Banner (Goalkeeper & Tactical rules) */}
      {Boolean(validationError || saveMutation.error) && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-warning/50 bg-warning/10 text-warning text-xs font-semibold shadow-md animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
            <span>
              {validationError ||
                (saveMutation.error instanceof Error
                  ? saveMutation.error.message
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
            teamId={activeTeamId}
            onPlayerDragStart={(player,event) => lineupDrag.start(event,player.userId,isManager && !saveMutation.isPending)}
            onPlayerAction={isManager ? openPlayerMenu : undefined}
            teamColor={activeTeam?.color || '#B7F34B'}
            isReadOnly={!isManager || saveMutation.isPending}
          />

          <div data-lineup-zone="bench" className={lineupDrag.drag ? "rounded-xl ring-2 ring-primary/40" : ""}><SubstitutesBench
            onUnassignPlayer={handleRemovePlayer}
            isRemoving={saveMutation.isPending}
            onPlayerDragStart={(player,event) => lineupDrag.start(event,player.userId,isManager && !saveMutation.isPending)}
            onPlayerAction={isManager ? openPlayerMenu : undefined}
            onDeployToPitch={player => { const converted = "teamId" in player ? player : { userId: player.userId, teamId: activeTeamId, displayName: player.profile?.displayName, avatarUrl: player.profile?.avatarUrl, coordinate: null, positionLabel: "SUB", isSubstitute: true }; movePlayer(converted, activeTeamId); }}
            unassignedSquadMembers={availableToAssign}
            isReadOnly={!isManager || saveMutation.isPending}
          /></div>
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
            onPlayerAction={isManager ? openPlayerMenu : undefined}
            onAssignPlayer={handleAssignPlayer}
            isAssigning={saveMutation.isPending}
            isReadOnly={!isManager}
          />
        </div>
      </div>
    </div>
  );
}
