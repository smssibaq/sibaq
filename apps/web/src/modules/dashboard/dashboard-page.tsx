import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/auth-provider';
import { squadApi } from '../squads/api';
import { matchApi } from '../matches/api';
import { queryKeys } from '@/infrastructure/query-keys';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, calculateCountdown } from '@/lib/dates';
import type { Match } from '@/types/contracts';
import { UpcomingGames } from './upcoming-games';
import { useUIStore } from '@/stores/ui-store';
import {
  Shield,
  Trophy,
  ArrowRight,
  Plus,
  UserPlus,
  Clock,
  MapPin,
  Users,
  Calendar,
  Filter,
  CheckCircle2,
  ChevronRight,
  Timer,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

export function DashboardPage() {
  const { user, profile } = useAuth();
  const openSportDrawer = useUIStore((s) => s.openSportDrawer);
  const [selectedSquadId, setSelectedSquadId] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 1. Fetch user's squads with TanStack Query
  const {
    data: squads = [],
    isLoading: isLoadingSquads,
    isError: isSquadsError,
    refetch: refetchSquads,
  } = useQuery({
    queryKey: queryKeys.squads.mySquads,
    queryFn: () => squadApi.listMySquads(),
  });

  // 2. Fetch matches for user's squads with TanStack Query
  const {
    data: allMatches = [],
    isLoading: isLoadingMatches,
    isError: isMatchesError,
    refetch: refetchMatches,
  } = useQuery({
    queryKey: queryKeys.matches.all,
    queryFn: () => matchApi.listUserMatches(),
  });

  // Filter matches based on selected squad
  const filteredMatches = useMemo(() => {
    if (selectedSquadId === 'all') return allMatches;
    return allMatches.filter((m) => m.squadId === selectedSquadId);
  }, [allMatches, selectedSquadId]);

  // Split into Upcoming (startsAt >= now and not cancelled/completed) and Recent (past or completed)
  const { upcomingMatches, recentMatches } = useMemo(() => {
    const now = new Date();
    const upcoming: Match[] = [];
    const recent: Match[] = [];

    for (const match of filteredMatches) {
      const matchDate = new Date(match.startsAt);
      if (
        (match.status === 'scheduled' || match.status === 'in_progress') &&
        matchDate.getTime() + 7200000 >= now.getTime() // within 2 hours of kickoff considered upcoming
      ) {
        upcoming.push(match);
      } else {
        recent.push(match);
      }
    }

    // Sort upcoming ascending (soonest first)
    upcoming.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    // Sort recent descending (most recent first)
    recent.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

    return { upcomingMatches: upcoming, recentMatches: recent };
  }, [filteredMatches]);

  const totalConfirmedPlayers = useMemo(() => {
    return upcomingMatches.reduce((acc, m) => acc + (m.attendanceCount?.playing ?? 0), 0);
  }, [upcomingMatches]);

  const activeSquad = squads.find((s) => s.id === selectedSquadId);

  const copyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="space-y-8">
      {/* 1. Welcome & Kerala Turf Header */}
      <div className="rounded-2xl border border-border bg-gradient-to-r from-surface to-surface-subtle p-4 sm:p-6 lg:p-8 shadow-modal relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-bold text-primary uppercase tracking-wider mb-2 sm:mb-3 whitespace-nowrap">
              <img
                src="/branding/kalikkanundo-logo.svg"
                alt="Kalikkanundo"
                className="h-3.5 w-3.5 sm:h-4 sm:w-4 object-contain shrink-0"
              />
              <span>Kalikkanundo Match Hub</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground truncate">
              Hi <span className="text-primary">{profile?.display_name || user?.email?.split('@')[0] || 'Player'}</span> {profile?.sports.find(sport => sport.is_primary)?.emoji}
            </h2>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
              Find your next game, organize your squad, and keep up with the sports you play.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
            <Button
              className="bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary-hover min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm"
              onClick={openSportDrawer}
            >
              <Plus className="h-4 w-4 mr-1.5 shrink-0" />
              <span>Schedule Match</span>
            </Button>
            <Button
              variant="outline"
              className="min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm"
              onClick={() => (window.location.href = '/squads/new')}
            >
              <Users className="h-4 w-4 mr-1.5 shrink-0" />
              <span>Create Squad</span>
            </Button>
            <Button
              variant="outline"
              className="min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm"
              onClick={() => (window.location.href = '/join')}
            >
              <UserPlus className="h-4 w-4 mr-1.5 shrink-0" />
              <span>Join via Code</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics & Status Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="border-border bg-surface shadow-card min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-1.5">
            <CardTitle className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              Your Squads
            </CardTitle>
            <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0 ml-1" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-black text-foreground">
              {isLoadingSquads ? '...' : squads.length}
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
              Active memberships
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface shadow-card min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-1.5">
            <CardTitle className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              Upcoming Fixtures
            </CardTitle>
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0 ml-1" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-black text-foreground">
              {isLoadingMatches ? '...' : upcomingMatches.length}
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
              {selectedSquadId === 'all' ? 'Across all squads' : activeSquad?.name || 'In selected squad'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface shadow-card min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-1.5">
            <CardTitle className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              Players In
            </CardTitle>
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success shrink-0 ml-1" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-black text-foreground">
              {isLoadingMatches ? '...' : totalConfirmedPlayers}
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
              Availability Playing for fixtures
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-surface shadow-card min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-1.5">
            <CardTitle className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              Timezone
            </CardTitle>
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0 ml-1" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-sm font-bold text-foreground">Asia/Kolkata</div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
              IST Kickoff schedules
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming games across every sport */}
      <UpcomingGames />

      {/* Error state if data fetching fails */}
      {(isSquadsError || isMatchesError) && (
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>Unable to load fixtures or squads from database. Please check your connection.</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              refetchSquads();
              refetchMatches();
            }}
          >
            Retry
          </Button>
        </div>
      )}

      {/* 3. Multi-Squad Selector & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="text-base font-bold text-foreground">Filter by Squad</h3>
        </div>

        {/* Squad Pills/Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedSquadId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] ${
              selectedSquadId === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-surface border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            All Squads ({squads.length})
          </button>

          {squads.map((sq) => (
            <button
              key={sq.id}
              type="button"
              onClick={() => setSelectedSquadId(sq.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center gap-1.5 ${
                selectedSquadId === sq.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-surface border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{sq.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Upcoming Fixtures Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-4 w-4" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Upcoming Fixtures</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {upcomingMatches.length} scheduled
          </span>
        </div>

        {isLoadingMatches ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border bg-surface p-6 space-y-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </Card>
            ))}
          </div>
        ) : upcomingMatches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-8 sm:p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
              <Trophy className="h-7 w-7" />
            </div>
            <h4 className="text-lg font-bold text-foreground">No Upcoming Matches</h4>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
              Schedule your squad&apos;s next 5v5 or 7v7 friendly at your local Kerala turf.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={() => {
                  if (selectedSquadId !== 'all') {
                    window.location.href = `/squads/${selectedSquadId}/matches/new`;
                  } else if (squads.length > 0) {
                    window.location.href = `/squads/${squads[0].id}/matches/new`;
                  } else {
                    window.location.href = '/squads/new';
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                <span>Schedule a Match</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingMatches.map((m) => {
              const countdown = calculateCountdown(m.startsAt);
              const targetPerTeam = m.playersPerTeam || 7;
              const requiredQuorum = m.mode === 'friendly' ? targetPerTeam * 2 : targetPerTeam;
              const playingCount = m.attendanceCount?.playing || 0;
              const isQuorumMet = playingCount >= requiredQuorum;

              return (
                <Card
                  key={m.id}
                  className="group hover:border-primary/50 transition-all cursor-pointer shadow-card hover:shadow-modal flex flex-col justify-between"
                  onClick={() => (window.location.href = `/matches/${m.id}`)}
                >
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                          {m.squadName}
                        </span>
                        <CardTitle className="text-lg font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {m.title}
                        </CardTitle>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{m.turfName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{formatDate(m.startsAt, 'EEE, MMM dd · h:mm a')}</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-2 border-t border-border space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Timer className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium text-foreground">{countdown.formatted}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-bold text-foreground">{playingCount}</span>
                        <span className="text-muted-foreground">/ {requiredQuorum} players</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-primary group-hover:translate-x-1 transition-transform">
                      {isQuorumMet ? (
                        <span className="text-success text-[11px] font-semibold">Quorum Met ·</span>
                      ) : null}
                      <span>Availability / Details</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Recent Matches Section */}
      {recentMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-subtle text-muted-foreground">
              <Trophy className="h-4 w-4" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Past & Completed Matches</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentMatches.slice(0, 6).map((m) => (
              <Card
                key={m.id}
                className="border-border bg-surface/70 hover:bg-surface hover:border-primary/40 transition-all cursor-pointer shadow-sm"
                onClick={() => (window.location.href = `/matches/${m.id}`)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">{m.squadName}</span>
                    <StatusBadge status={m.status} />
                  </div>
                  <h5 className="text-sm font-bold text-foreground mt-1 truncate">{m.title}</h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(m.startsAt, 'MMM dd, yyyy')} · {m.turfName}
                  </p>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 6. Squads Roster Overview (Developer A Rich Squad Cards) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Your Football Squads</h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => (window.location.href = '/squads/new')}
            className="text-xs font-bold text-primary hover:text-primary-hover hover:bg-primary/10"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            <span>New Squad</span>
          </Button>
        </div>

        {isLoadingSquads ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border bg-surface p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full rounded-lg" />
              </Card>
            ))}
          </div>
        ) : squads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-8 sm:p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
              <Shield className="h-7 w-7" />
            </div>
            <h4 className="text-lg font-bold text-foreground">No Squads Joined Yet</h4>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
              Create a permanent squad for your turf football group, or join friends using their room code.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button onClick={() => (window.location.href = '/squads/new')}>
                <Plus className="h-4 w-4 mr-1.5" />
                <span>Create Squad</span>
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = '/join')}>
                <UserPlus className="h-4 w-4 mr-1.5" />
                <span>Join via Code</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {squads.map((sq) => {
              const initials = getInitials(sq.name);
              const isCopied = copiedCode === sq.joinCode;

              return (
                <Card
                  key={sq.id}
                  className="group hover:border-primary/50 transition-all cursor-pointer shadow-card hover:shadow-modal flex flex-col justify-between"
                  onClick={() => (window.location.href = `/squads/${sq.id}`)}
                >
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 text-primary font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
                          {initials}
                        </div>
                        <div>
                          <CardTitle className="text-base sm:text-lg font-bold line-clamp-1 group-hover:text-primary transition-colors">
                            {sq.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            {sq.role && <StatusBadge status={sq.role} />}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {sq.memberCount || 1} {sq.memberCount === 1 ? 'Player' : 'Players'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <CardDescription className="line-clamp-2 text-xs text-muted-foreground leading-relaxed min-h-[2.5rem]">
                      {sq.description || 'Kerala turf squad'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-2 border-t border-border space-y-3">
                    <div className="flex items-center justify-between bg-surface-subtle/80 px-3 py-1.5 rounded-lg border border-border">
                      <span className="text-[11px] font-medium text-muted-foreground">Join Code:</span>
                      <button
                        type="button"
                        onClick={(e) => copyCode(e, sq.joinCode)}
                        className="inline-flex items-center gap-1 font-mono text-xs font-bold text-primary hover:underline"
                        title="Click to copy join code"
                      >
                        <span className="truncate max-w-[120px]">{sq.joinCode}</span>
                        {isCopied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-primary font-bold group-hover:translate-x-1 transition-transform">
                      <span>Open Squad Hub</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
