import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { PageHeader } from '@/components/common/page-header';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { matchApi } from './api';
import { squadApi } from '../squads/api';
import { queryKeys } from '@/infrastructure/query-keys';
import { formatDate, calculateCountdown } from '@/lib/dates';
import type { Match } from '@/types/contracts';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Trophy,
  Plus,
  ArrowRight,
  Shield,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export function MatchesHubPage() {
  const navigate = useNavigate();
  const [selectedSquadId, setSelectedSquadId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'live' | 'past'>('upcoming');

  // 1. Fetch user's squads for squad filter pills
  const { data: squads = [] } = useQuery({
    queryKey: queryKeys.squads.mySquads,
    queryFn: () => squadApi.listMySquads(),
  });

  // 2. Fetch matches across all user's squads
  const { data: allMatches = [], isLoading } = useQuery({
    queryKey: queryKeys.matches.all,
    queryFn: () => matchApi.listUserMatches(),
  });

  // 3. Filter matches by selected squad
  const squadFilteredMatches = useMemo(() => {
    if (selectedSquadId === 'all') return allMatches;
    return allMatches.filter((m) => m.squadId === selectedSquadId);
  }, [allMatches, selectedSquadId]);

  // 4. Split matches into Live, Upcoming, and Past
  const { liveMatches, upcomingMatches, pastMatches } = useMemo(() => {
    const now = new Date();
    const live: Match[] = [];
    const upcoming: Match[] = [];
    const past: Match[] = [];

    for (const match of squadFilteredMatches) {
      const matchDate = new Date(match.startsAt);
      const isLiveStatus = match.status === 'in_progress';
      const isPastStatus = match.status === 'completed' || match.status === 'cancelled';

      // Within 90 minutes of kickoff and scheduled is considered live window
      const isDuringMatch =
        matchDate.getTime() <= now.getTime() &&
        now.getTime() <= matchDate.getTime() + 90 * 60 * 1000 &&
        match.status !== 'cancelled' &&
        match.status !== 'completed';

      if (isLiveStatus || isDuringMatch) {
        live.push(match);
      } else if (isPastStatus || matchDate.getTime() + 90 * 60 * 1000 < now.getTime()) {
        past.push(match);
      } else {
        upcoming.push(match);
      }
    }

    // Sort upcoming soonest first
    upcoming.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    // Sort past most recent first
    past.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

    return { liveMatches: live, upcomingMatches: upcoming, pastMatches: past };
  }, [squadFilteredMatches]);

  const activeMatchesList =
    activeTab === 'live'
      ? liveMatches
      : activeTab === 'upcoming'
      ? upcomingMatches
      : pastMatches;

  const nextUpcomingMatch = upcomingMatches[0] || liveMatches[0] || null;
  const nextCountdown = nextUpcomingMatch ? calculateCountdown(nextUpcomingMatch.startsAt) : null;
  const nextCountdownText = nextCountdown
    ? nextCountdown.isComplete
      ? 'Kickoff Now'
      : nextCountdown.days > 0
      ? `In ${nextCountdown.days}d ${nextCountdown.hours}h`
      : nextCountdown.hours > 0
      ? `In ${nextCountdown.hours}h ${nextCountdown.minutes}m`
      : `In ${nextCountdown.minutes}m`
    : '';

  const handleScheduleMatch = () => {
    if (squads.length > 0) {
      const targetSquadId = selectedSquadId !== 'all' ? selectedSquadId : squads[0].id;
      navigate({
        to: '/squads/$squadId/matches/new',
        params: { squadId: targetSquadId },
      });
    } else {
      navigate({ to: '/squads/new' });
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading your squad fixtures and match schedules..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Match Center & Fixtures"
        description="Unified matchday schedule across all your squads. Manage availability updates, track turf venues, and view formations."
        badge={upcomingMatches.length > 0 ? `${upcomingMatches.length} Upcoming` : 'Fixtures'}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              onClick={handleScheduleMatch}
              className="bg-primary text-primary-foreground hover:bg-primary-hover font-bold shadow-sm text-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span>Schedule Match</span>
            </Button>
          </div>
        }
      />

      {/* Featured Next Match Highlight Card (If upcoming match exists) */}
      {nextUpcomingMatch && (
        <Card className="border-primary/40 bg-gradient-to-r from-surface via-surface to-primary/5 shadow-card overflow-hidden">
          <div className="h-1 bg-primary w-full" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    Next Fixture • {nextCountdownText}
                  </span>
                  <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">
                    {nextUpcomingMatch.playersPerTeam}v{nextUpcomingMatch.playersPerTeam}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-foreground truncate">
                    {nextUpcomingMatch.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      {nextUpcomingMatch.squadName || 'Squad Match'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(nextUpcomingMatch.startsAt)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {nextUpcomingMatch.turfName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate({ to: '/matches/$matchId/lineup', params: { matchId: nextUpcomingMatch.id } })}
                  className="border-primary/40 text-primary hover:bg-primary/10 text-xs font-bold flex-1 sm:flex-initial justify-center"
                >
                  <Trophy className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  <span>Tactical Lineup</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate({ to: '/matches/$matchId', params: { matchId: nextUpcomingMatch.id } })}
                  className="bg-primary text-primary-foreground hover:bg-primary-hover text-xs font-bold shadow-sm flex-1 sm:flex-initial justify-center"
                >
                  <span>Match Details</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5 shrink-0" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Squad Filter Pill Bar */}
      {squads.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
            Filter Squad:
          </span>
          <button
            type="button"
            onClick={() => setSelectedSquadId('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              selectedSquadId === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-surface border border-border text-foreground hover:bg-surface-subtle'
            }`}
          >
            All Squads ({allMatches.length})
          </button>
          {squads.map((sq) => {
            const isSelected = selectedSquadId === sq.id;
            const squadMatchCount = allMatches.filter((m) => m.squadId === sq.id).length;
            return (
              <button
                key={sq.id}
                type="button"
                onClick={() => setSelectedSquadId(sq.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-surface border border-border text-foreground hover:bg-surface-subtle'
                }`}
              >
                <span>{sq.name}</span>
                <span
                  className={`text-[10px] px-1 rounded ${
                    isSelected ? 'bg-black/20 text-inherit' : 'bg-surface-subtle text-muted-foreground'
                  }`}
                >
                  {squadMatchCount}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Fixture Status Tabs (Upcoming / Live / Past) */}
      <div className="border-b border-border overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-4 sm:gap-6 min-w-max">
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`flex items-center gap-1.5 sm:gap-2 pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'upcoming'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">Upcoming</span>
            <span className="hidden sm:inline">Upcoming Fixtures</span>
            <span className="rounded-full bg-primary/15 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-mono text-primary font-bold">
              {upcomingMatches.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-1.5 sm:gap-2 pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'live'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Activity className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">Live</span>
            <span className="hidden sm:inline">Live Matches</span>
            {liveMatches.length > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-danger animate-ping" />
            )}
            <span className="rounded-full bg-surface-subtle px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-mono text-foreground font-bold">
              {liveMatches.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('past')}
            className={`flex items-center gap-1.5 sm:gap-2 pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'past'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">Past</span>
            <span className="hidden sm:inline">Past Matches</span>
            <span className="rounded-full bg-surface-subtle px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-mono text-muted-foreground font-medium">
              {pastMatches.length}
            </span>
          </button>
        </div>
      </div>

      {/* Match Cards List */}
      {activeMatchesList.length === 0 ? (
        <EmptyState
          title={
            activeTab === 'upcoming'
              ? 'No Upcoming Fixtures'
              : activeTab === 'live'
              ? 'No Matches Currently Live'
              : 'No Past Match Records'
          }
          description={
            activeTab === 'upcoming'
              ? "Schedule a turf match for your squad to get availability updates and prepare the tactical formation."
              : activeTab === 'live'
              ? 'No active matches happening right now. Upcoming fixtures will appear here during kickoff.'
              : 'Completed match scores and lineups will be cataloged here.'
          }
          icon={<CalendarDays className="h-6 w-6 text-primary" />}
          actionText={activeTab === 'upcoming' ? 'Schedule Match' : undefined}
          onAction={activeTab === 'upcoming' ? handleScheduleMatch : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeMatchesList.map((m) => {
            const playingCount = m.attendanceCount?.playing ?? 0;
            const capacity = m.mode === 'friendly' ? m.playersPerTeam * 2 : m.playersPerTeam;
            const isFull = playingCount >= capacity;

            return (
              <Card
                key={m.id}
                className="group border-border bg-surface hover:border-primary/50 transition-all duration-200 shadow-card flex flex-col justify-between"
              >
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <Badge variant="outline" className="border-border text-[10px] font-mono text-muted-foreground">
                      {m.playersPerTeam}v{m.playersPerTeam} • {m.mode === 'friendly' ? 'Friendly' : 'Squad Match'}
                    </Badge>
                    <StatusBadge status={m.status} />
                  </div>
                  <CardTitle className="text-base font-extrabold text-foreground group-hover:text-primary transition-colors truncate">
                    {m.title}
                  </CardTitle>
                  <p className="text-xs font-medium text-primary flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    <span>{m.squadName || 'Squad Match'}</span>
                  </p>
                </CardHeader>

                <CardContent className="pt-3 pb-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{formatDate(m.startsAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{m.turfName}</span>
                    </div>

                    {/* Attendance Turnout Indicator */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Attendance:
                        </span>
                        <span className={`font-bold font-mono ${isFull ? 'text-primary' : 'text-foreground'}`}>
                          {playingCount}/{capacity} Confirmed
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isFull ? 'bg-primary' : 'bg-primary/70'
                          }`}
                          style={{ width: `${Math.min(100, (playingCount / capacity) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate({ to: '/matches/$matchId/lineup', params: { matchId: m.id } })}
                      className="w-full text-xs font-bold border-border text-foreground hover:bg-surface-subtle h-8 px-2"
                    >
                      <Trophy className="h-3.5 w-3.5 mr-1 text-primary" />
                      <span>Lineup</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => navigate({ to: '/matches/$matchId', params: { matchId: m.id } })}
                      className="w-full text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-hover h-8 px-2 shadow-sm"
                    >
                      <span>Availability</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
