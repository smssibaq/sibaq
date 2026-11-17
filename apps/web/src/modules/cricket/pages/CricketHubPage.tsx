import { useMemo, useState } from 'react';
import { KeyRound, Plus, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { LoadingState } from '@/components/common/loading-state';
import { normalizeError } from '@/lib/errors';
import { formatDate } from '@/lib/dates';
import { useCricketGames } from '../api';
import { cricketPaths, useCricketNav, formatFormat } from '../utils';
import type { CricketGameSummary } from '../types';
import {
  FeaturedFixtureCard,
  MatchStatusTabs,
  MatchFixtureCard,
} from '@/components/common/match-center-ui';

export function CricketHubPage() {
  const go = useCricketNav();
  const { data: allGames = [], isLoading, error, refetch, isRefetching } = useCricketGames();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'live' | 'past'>('upcoming');

  // Split matches into Live, Upcoming, and Past
  const { liveGames, upcomingGames, pastGames } = useMemo(() => {
    const now = Date.now();
    const live: CricketGameSummary[] = [];
    const upcoming: CricketGameSummary[] = [];
    const past: CricketGameSummary[] = [];

    for (const g of allGames) {
      const matchTime = new Date(g.starts_at).getTime();
      const isPastStatus = g.status === 'completed' || g.status === 'cancelled';
      // Within 3 hours of start is considered the live window for cricket
      const isLiveWindow =
        matchTime <= now &&
        now <= matchTime + 3 * 60 * 60 * 1000 &&
        !isPastStatus;

      if (g.status === 'in_progress' || isLiveWindow) {
        live.push(g);
      } else if (isPastStatus || matchTime + 3 * 60 * 60 * 1000 < now) {
        past.push(g);
      } else {
        upcoming.push(g);
      }
    }

    upcoming.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    past.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

    return { liveGames: live, upcomingGames: upcoming, pastGames: past };
  }, [allGames]);

  const activeGamesList =
    activeTab === 'live' ? liveGames : activeTab === 'upcoming' ? upcomingGames : pastGames;

  const nextUpcomingGame = upcomingGames[0] || liveGames[0] || null;

  if (isLoading) {
    return <LoadingState message="Loading cricket fixtures and match center..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={normalizeError(error).message}
        code={normalizeError(error).code}
        onRetry={() => refetch()}
        isRetrying={isRefetching}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header (Matches Football Match Center) */}
      <PageHeader
        title="Cricket Match Center"
        description="Unified matchday schedule for friendly nets and turf matches. Manage RSVPs, tactical field placements, and overs."
        badge={upcomingGames.length > 0 ? `${upcomingGames.length} Upcoming` : 'Fixtures'}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => go(cricketPaths.join())}
              className="text-xs h-9 font-semibold"
            >
              <KeyRound className="mr-1.5 h-3.5 w-3.5" />
              <span>Join with Code</span>
            </Button>
            <Button
              size="sm"
              onClick={() => go(cricketPaths.create)}
              className="bg-primary text-primary-foreground hover:bg-primary-hover font-bold shadow-sm text-xs h-9"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              <span>Schedule Match</span>
            </Button>
          </div>
        }
      />

      {/* 2. Featured Next Match Card (If upcoming exists) */}
      {nextUpcomingGame && (
        <FeaturedFixtureCard
          startsAt={nextUpcomingGame.starts_at}
          formatBadge={formatFormat(nextUpcomingGame.players_per_side, nextUpcomingGame.overs_per_innings)}
          title={nextUpcomingGame.title}
          subtitle={nextUpcomingGame.is_organizer ? 'Organized by You' : 'Cricket Match'}
          dateText={formatDate(nextUpcomingGame.starts_at)}
          venueText={nextUpcomingGame.venue}
          lineupText="Tactical Field"
          rsvpText="RSVP & Details"
          onLineup={() => go(cricketPaths.game(nextUpcomingGame.game_id))}
          onRsvp={() => go(cricketPaths.game(nextUpcomingGame.game_id))}
        />
      )}

      {/* 3. Match Status Tabs (Upcoming / Live / Past) */}
      <MatchStatusTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        upcomingCount={upcomingGames.length}
        liveCount={liveGames.length}
        pastCount={pastGames.length}
      />

      {/* 4. Match Cards Grid */}
      {activeGamesList.length === 0 ? (
        <EmptyState
          title={
            activeTab === 'live'
              ? 'No Live Matches Right Now'
              : activeTab === 'upcoming'
              ? 'No Upcoming Cricket Matches'
              : 'No Past Matches'
          }
          description={
            activeTab === 'upcoming'
              ? 'Schedule a cricket match or enter an invite code to join your squad on the pitch.'
              : 'Completed matches will appear here.'
          }
          icon={<CalendarDays className="h-6 w-6 text-primary" />}
          actionText={activeTab === 'upcoming' ? 'Schedule Match' : undefined}
          onAction={activeTab === 'upcoming' ? () => go(cricketPaths.create) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeGamesList.map((g) => (
            <MatchFixtureCard
              key={g.game_id}
              formatBadge={formatFormat(g.players_per_side, g.overs_per_innings)}
              status={g.status}
              title={g.title}
              subtitle={g.is_organizer ? 'Organized by You' : 'Cricket Fixture'}
              dateText={formatDate(g.starts_at)}
              venueText={g.venue}
              playingCount={g.confirmed_count}
              capacity={g.capacity}
              lineupText="Lineup"
              rsvpText="RSVP"
              onLineup={() => go(cricketPaths.game(g.game_id))}
              onRsvp={() => go(cricketPaths.game(g.game_id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
