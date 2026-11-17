import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/page-header';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { SquadLogo } from '../squads/squad-logo';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import { squadApi } from '../squads/api';
import { matchApi } from '../matches/api';
import { queryKeys } from '@/infrastructure/query-keys';
import { useAuth } from '../auth/auth-provider';
import {
  formatDate,
  formatInTimezone,
  calculateCountdown,
  DEFAULT_TIMEZONE,
} from '@/lib/dates';
import type { SquadMember, Match } from '@/types/contracts';
import {
  Shield,
  Users,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Copy,
  Plus,
  ArrowRight,
  Sparkles,
  Timer,
  CheckCircle2,
  ChevronRight,
  Info,
  Activity,
} from 'lucide-react';
import { clsx } from 'clsx';

export function SquadHubPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Query squad list
  const {
    data: squads = [],
    isLoading: isLoadingSquads,
  } = useQuery({
    queryKey: queryKeys.squads.mySquads,
    queryFn: () => squadApi.listMySquads(),
  });

  // Query param or selected squad ID
  const searchParams = new URLSearchParams(window.location.search);
  const initialSquadId = searchParams.get('squadId') || '';

  const [selectedSquadId, setSelectedSquadId] = useState<string>(initialSquadId);
  const [activeTab, setActiveTab] = useState<'fixtures' | 'roster' | 'about'>('fixtures');

  // Active squad object
  const activeSquad = useMemo(() => {
    if (!squads || squads.length === 0) return null;
    return squads.find((s) => s.id === selectedSquadId) || squads[0];
  }, [squads, selectedSquadId]);

  const activeId = activeSquad?.id || '';

  // Query active squad members
  const {
    data: members = [],
    isLoading: isLoadingMembers,
  } = useQuery<SquadMember[]>({
    queryKey: queryKeys.squads.members(activeId),
    queryFn: () => (activeId ? squadApi.listMembers(activeId) : Promise.resolve([])),
    enabled: Boolean(activeId),
  });

  // Query squad matches
  const {
    data: matches = [],
    isLoading: isLoadingMatches,
  } = useQuery<Match[]>({
    queryKey: queryKeys.matches.bySquad(activeId),
    queryFn: () => (activeId ? matchApi.listSquadMatches(activeId) : Promise.resolve([])),
    enabled: Boolean(activeId),
  });

  // Role in active squad
  const myRole = useMemo(() => {
    if (!user || !members) return 'player';
    const me = members.find((m) => m.userId === user.id);
    return me?.role || 'player';
  }, [user, members]);

  const isAdminOrOwner = myRole === 'owner' || myRole === 'admin';

  // Split matches into Live, Upcoming, and Past
  const { liveMatch, upcomingMatches, pastMatches } = useMemo(() => {
    const now = new Date();
    let live: Match | null = null;
    const upcoming: Match[] = [];
    const past: Match[] = [];

    for (const m of matches) {
      const matchTime = new Date(m.startsAt).getTime();
      const diffMinutes = (matchTime - now.getTime()) / (1000 * 60);

      if (m.status === 'in_progress' || (diffMinutes <= 30 && diffMinutes >= -120 && m.status === 'scheduled')) {
        if (!live) live = m;
      } else if (matchTime > now.getTime() && m.status === 'scheduled') {
        upcoming.push(m);
      } else {
        past.push(m);
      }
    }

    upcoming.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    past.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

    return { liveMatch: live, upcomingMatches: upcoming, pastMatches: past };
  }, [matches]);

  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success('Room Code Copied!', `Share ${code} with friends to invite them to this squad.`);
  };

  const getPositionBadge = (pos?: string | null) => {
    if (!pos) return null;
    const colors: Record<string, string> = {
      GK: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      DEF: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      MID: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      ATT: 'bg-red-500/20 text-red-300 border-red-500/40',
    };
    return (
      <span
        className={clsx(
          'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border',
          colors[pos] || 'bg-surface-subtle text-muted-foreground'
        )}
      >
        {pos}
      </span>
    );
  };

  if (isLoadingSquads) {
    return <LoadingState message="Loading your football squads & match hubs..." />;
  }

  // Zero-squad state
  if (!squads || squads.length === 0) {
    return (
      <div className="py-12 max-w-2xl mx-auto space-y-8">
        <EmptyState
          title="You're Not in Any Squads Yet"
          description="Kalikkanundo is built around permanent football squads. Create a squad for your regular turf gang or join with a room code!"
          actionText="Create New Squad"
          onAction={() => (window.location.href = '/squads/new')}
        />
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/join')}
            className="min-h-[44px]"
          >
            <Users className="h-4 w-4 mr-2 text-primary" />
            <span>Join with Room Code</span>
          </Button>
        </div>
      </div>
    );
  }

  if (!activeSquad) {
    return null;
  }

  return (
    <div className="space-y-8 pb-16">
        {/* Top Header & Squad Switcher */}
        <PageHeader
          title="Squad Fixtures & Hub"
          description="Complete hub for your Kerala turf squads, live headcounts, fixtures, and tactical rosters."
          badge="Squad Center"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => (window.location.href = '/squads/new')}
                className="text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5 mr-1 text-primary" />
                <span>New Squad</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => (window.location.href = '/join')}
                className="text-xs font-bold"
              >
                <Users className="h-3.5 w-3.5 mr-1" />
                <span>Join Code</span>
              </Button>
            </div>
          }
        />

        {/* Multi-Squad Carousel / Pills if user has multiple squads */}
        {squads.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border/60">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
              Your Squads:
            </span>
            {squads.map((sq) => {
              const isSelected = sq.id === activeId;
              return (
                <button
                  key={sq.id}
                  type="button"
                  onClick={() => setSelectedSquadId(sq.id)}
                  className={clsx(
                    'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : 'bg-surface text-foreground border-border hover:border-primary/50'
                  )}
                >
                  <SquadLogo squadId={sq.id} size="xs" className="border-0" />
                  <span>{sq.name}</span>
                  <span className="font-mono text-[10px] opacity-80">({sq.joinCode})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Active Squad Hero Banner */}
        {activeSquad && (
          <div className="rounded-2xl border border-border bg-gradient-to-br from-surface via-surface to-surface-subtle p-6 sm:p-8 shadow-modal relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4">
                <SquadLogo squadId={activeSquad.id} size="lg" className="border-2 shadow-md" />
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                      <Sparkles className="h-3 w-3" />
                      <span>{myRole.toUpperCase()}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(activeSquad.joinCode)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-0.5 text-xs font-mono font-bold text-foreground hover:border-primary transition-colors"
                      title="Click to copy room code"
                    >
                      <span>Room Code: {activeSquad.joinCode}</span>
                      <Copy className="h-3 w-3 text-primary" />
                    </button>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-foreground">
                    {activeSquad.name}
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-xl">
                    {activeSquad.description || 'Kerala night football squad for weekly turf fixtures.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {isAdminOrOwner && (
                  <Button
                    className="bg-primary text-primary-foreground font-bold hover:bg-primary-hover shadow-md min-h-[44px]"
                    onClick={() => (window.location.href = `/squads/${activeId}/matches/new`)}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    <span>Schedule Match</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={() => (window.location.href = `/squads/${activeId}/settings`)}
                >
                  <Shield className="h-4 w-4 mr-1.5 text-primary" />
                  <span>Squad Settings</span>
                </Button>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-5 pt-5 border-t border-border/80">
              <div className="rounded-xl border border-border/60 bg-surface/80 p-3 sm:p-3.5 flex flex-col justify-between min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 truncate">
                  <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" />
                  <span className="truncate">Active Squad</span>
                </span>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-foreground leading-none">
                    {members.length}
                  </span>
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    {members.length === 1 ? 'Member' : 'Members'}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-surface/80 p-3 sm:p-3.5 flex flex-col justify-between min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 truncate">
                  <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" />
                  <span className="truncate">Upcoming Fixtures</span>
                </span>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-primary leading-none">
                    {upcomingMatches.length}
                  </span>
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    {upcomingMatches.length === 1 ? 'Match' : 'Matches'}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-surface/80 p-3 sm:p-3.5 flex flex-col justify-between min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 truncate">
                  <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" />
                  <span className="truncate">Match History</span>
                </span>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-foreground leading-none">
                    {pastMatches.length}
                  </span>
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Finished
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-surface/80 p-3 sm:p-3.5 flex flex-col justify-between min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 truncate">
                  <Activity className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" />
                  <span className="truncate">Fixture Quorum</span>
                </span>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-foreground leading-none">
                    {matches.length > 0
                      ? `${Math.round(
                          (matches.filter((m) => (m.attendanceCount?.playing ?? 0) >= m.playersPerTeam).length /
                            matches.length) *
                            100
                        )}%`
                      : '100%'}
                  </span>
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    Met
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live / Next Up Match Banner */}
        {liveMatch && (
          <div className="rounded-2xl border-2 border-primary/50 bg-primary/10 p-5 shadow-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black animate-pulse">
                  <Timer className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                      <span>Live / Kickoff Imminent</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {liveMatch.mode === 'friendly' ? 'Friendly Derby' : 'Practice Session'}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-foreground mt-0.5">{liveMatch.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>{liveMatch.turfName}</span>
                    <span>·</span>
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>{formatInTimezone(liveMatch.startsAt, DEFAULT_TIMEZONE)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  className="bg-primary text-primary-foreground font-bold hover:bg-primary-hover shadow-md min-h-[44px]"
                  onClick={() => (window.location.href = `/matches/${liveMatch.id}`)}
                >
                  <span>Enter Match & Live RSVP</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={() => (window.location.href = `/matches/${liveMatch.id}/lineup`)}
                >
                  <Trophy className="h-4 w-4 mr-1.5 text-primary" />
                  <span>Pitch Lineup</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Section Navigation Tabs */}
        <div className="w-full overflow-x-auto pb-2 border-b border-border">
          <div className="flex items-center gap-2 min-w-max">
            <button
              type="button"
              onClick={() => setActiveTab('fixtures')}
              className={clsx(
                'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[40px]',
                activeTab === 'fixtures'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
              )}
            >
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">Fixtures ({matches.length})</span>
              <span className="hidden sm:inline">Fixtures & History ({matches.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className={clsx(
                'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[40px]',
                activeTab === 'roster'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
              )}
            >
              <Users className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">Players ({members.length})</span>
              <span className="hidden sm:inline">Squad Roster ({members.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className={clsx(
                'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[40px]',
                activeTab === 'about'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
              )}
            >
              <Info className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">About</span>
              <span className="hidden sm:inline">About & Governance</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Fixtures & History */}
        {activeTab === 'fixtures' && (
          <div className="space-y-8">
            {/* Upcoming Matches */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span>Scheduled Upcoming Fixtures ({upcomingMatches.length})</span>
                </h3>
                {isAdminOrOwner && (
                  <Button
                    size="sm"
                    onClick={() => (window.location.href = `/squads/${activeId}/matches/new`)}
                    className="text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-hover"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    <span>Schedule Match</span>
                  </Button>
                )}
              </div>

              {isLoadingMatches ? (
                <LoadingState message="Loading squad matches..." />
              ) : upcomingMatches.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
                  <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-foreground">No Upcoming Fixtures</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    There are no scheduled games for {activeSquad?.name}. Schedule your next 5v5 or 7v7 turf session!
                  </p>
                  {isAdminOrOwner && (
                    <Button
                      size="sm"
                      onClick={() => (window.location.href = `/squads/${activeId}/matches/new`)}
                      className="mt-4 bg-primary text-primary-foreground font-bold hover:bg-primary-hover"
                    >
                      Schedule Match
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingMatches.map((m) => {
                    const countdown = calculateCountdown(m.startsAt);
                    const target = m.mode === 'friendly' ? m.playersPerTeam * 2 : m.playersPerTeam;
                    const playing = m.attendanceCount?.playing ?? 0;
                    const isQuorumMet = playing >= target;

                    return (
                      <Card
                        key={m.id}
                        className="border-border bg-surface hover:border-primary/50 transition-all shadow-card cursor-pointer flex flex-col justify-between"
                        onClick={() => (window.location.href = `/matches/${m.id}`)}
                      >
                        <CardHeader className="p-5 pb-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-bold text-primary uppercase tracking-wider">
                              {m.mode === 'friendly' ? `${m.playersPerTeam}v${m.playersPerTeam} Friendly` : `${m.playersPerTeam}s Session`}
                            </span>
                            <StatusBadge status={m.status} />
                          </div>
                          <CardTitle className="text-base font-bold text-foreground line-clamp-1">
                            {m.title}
                          </CardTitle>
                          <div className="space-y-1 pt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5 font-semibold text-foreground">
                              <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span>{formatInTimezone(m.startsAt, DEFAULT_TIMEZONE)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 truncate">
                              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="truncate">{m.turfName}</span>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="p-5 pt-0">
                          {/* Countdown pill */}
                          <div className="rounded-lg bg-surface-subtle p-2 mb-3 flex items-center justify-between text-xs font-mono font-bold">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Timer className="h-3 w-3 text-primary" />
                              <span>Kickoff:</span>
                            </span>
                            <span className="text-primary">{countdown.formatted}</span>
                          </div>

                          {/* Attendance breakdown strip */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-primary flex items-center gap-0.5">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>{playing} Going</span>
                              </span>
                              <span className="text-muted-foreground">of {target}</span>
                            </div>

                            <div className="flex items-center gap-1 text-xs font-bold text-primary">
                              {isQuorumMet ? (
                                <Badge variant="success" className="text-[10px] px-1.5 py-0">Quorum</Badge>
                              ) : null}
                              <span>RSVP →</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Past Matches */}
            {pastMatches.length > 0 && (
              <div>
                <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <span>Past & Completed Fixtures ({pastMatches.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pastMatches.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => (window.location.href = `/matches/${m.id}`)}
                      className="p-3.5 rounded-xl border border-border/80 bg-surface-subtle/50 hover:bg-surface hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="truncate mr-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={m.status} />
                          <span className="text-xs text-muted-foreground">
                            {formatDate(m.startsAt, 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-foreground mt-1 truncate">{m.title}</h5>
                        <p className="text-[11px] text-muted-foreground truncate">{m.turfName}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Squad Roster */}
        {activeTab === 'roster' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Squad Members ({members.length})</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Players available for team selection and line-up tactics.
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => (window.location.href = `/squads/${activeId}/members`)}
                className="text-xs"
              >
                <span>Full Governance & Roles →</span>
              </Button>
            </div>

            {isLoadingMembers ? (
              <LoadingState message="Loading squad roster..." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {members.map((m) => {
                  const displayName = m.profile?.displayName || 'Player';
                  return (
                    <div
                      key={m.userId}
                      className="p-3.5 rounded-xl border border-border bg-surface flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={m.profile?.avatarUrl || undefined}
                          fallback={displayName}
                          className="h-9 w-9 text-xs font-bold border border-primary/30"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-foreground">{displayName}</span>
                            {getPositionBadge(m.profile?.preferredPosition)}
                          </div>
                          <span className="text-[11px] text-muted-foreground block capitalize">
                            {m.role} {m.status === 'pending' ? '· (Pending)' : ''}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={m.role === 'owner' ? 'success' : m.role === 'admin' ? 'warning' : 'default'}
                        className="text-[10px] uppercase font-bold"
                      >
                        {m.role}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: About & Governance */}
        {activeTab === 'about' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border bg-surface p-6 shadow-card space-y-4">
              <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>Squad Details & Credentials</span>
              </h4>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Squad Name:</span>
                  <span className="font-bold text-foreground">{activeSquad.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Permanent Room Code:</span>
                  <span className="font-mono font-bold text-primary">{activeSquad.joinCode}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Squad ID:</span>
                  <span className="font-mono text-muted-foreground text-[11px] truncate max-w-[200px]">{activeSquad.id}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-semibold text-foreground">{formatDate(activeSquad.createdAt, 'MMM dd, yyyy')}</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  className="w-full bg-primary text-primary-foreground font-bold hover:bg-primary-hover"
                  onClick={() => handleCopyCode(activeSquad.joinCode)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  <span>Copy Join Code to Invite Players</span>
                </Button>
              </div>
            </Card>

            <Card className="border-border bg-surface p-6 shadow-card space-y-4">
              <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <span>Kalikkanundo Squad Guidelines</span>
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground list-disc pl-4 leading-relaxed">
                <li>
                  <strong className="text-foreground">Quorum Confirmation:</strong> Match fixtures automatically require headcounts matching side capacities (e.g. 14 players for 7v7 friendlies).
                </li>
                <li>
                  <strong className="text-foreground">Smart Waitlists:</strong> When fixtures fill up, additional players can queue on the waitlist and are promoted atomically if someone drops out.
                </li>
                <li>
                  <strong className="text-foreground">Captains & Admins:</strong> Squad owners and admins can configure match deadlines, edit fixtures, and manage member roles.
                </li>
                <li>
                  <strong className="text-foreground">Pitch Formations:</strong> Confirmed players can be deployed onto the tactical pitch board to assign 2-3-1 or 3-2-1 formations.
                </li>
              </ul>

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => (window.location.href = `/squads/${activeId}/settings`)}
                >
                  <Shield className="h-4 w-4 mr-2 text-primary" />
                  <span>Configure Squad Settings</span>
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
  );
}
