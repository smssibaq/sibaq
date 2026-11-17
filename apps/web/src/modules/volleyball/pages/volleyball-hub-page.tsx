import { useMemo, useState } from 'react';
import { KeyRound, Plus, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { LoadingState } from '@/components/common/loading-state';
import { normalizeError } from '@/lib/errors';
import { formatDate } from '@/lib/dates';
import { useVolleyballGames } from '../hooks';
import { volleyballPaths, useVolleyballNav, formatFormat } from '../utils';
import type { VolleyballGameSummary } from '@/types/sports/volleyball.db';
import {
  FeaturedFixtureCard,
  MatchStatusTabs,
  MatchFixtureCard,
} from '@/components/common/match-center-ui';

export function VolleyballHubPage() {
  const go = useVolleyballNav();
  const { data: allGames = [], isLoading, error, refetch, isRefetching } = useVolleyballGames();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'live' | 'past'>('upcoming');

  // Split matches into Live, Upcoming, and Past
  const { liveGames, upcomingGames, pastGames } = useMemo(() => {
    const now = Date.now();
    const live: VolleyballGameSummary[] = [];
    const upcoming: VolleyballGameSummary[] = [];
    const past: VolleyballGameSummary[] = [];

    for (const g of allGames) {
      const matchTime = new Date(g.starts_at).getTime();
      const isPastStatus = g.status === 'completed' || g.status === 'cancelled';
      // Within 2 hours of start is considered the live window for volleyball
      const isLiveWindow =
        matchTime <= now &&
        now <= matchTime + 2 * 60 * 60 * 1000 &&
        !isPastStatus;

      if (g.status === 'in_progress' || isLiveWindow) {
        live.push(g);
      } else if (isPastStatus || matchTime + 2 * 60 * 60 * 1000 < now) {
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
    return <LoadingState message="Loading volleyball fixtures and match center..." />;
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
        title="Volleyball Match Center"
        description="Unified matchday schedule for 4v4 & 6v6 beach and court games. Track team RSVPs and split squads."
        badge={upcomingGames.length > 0 ? `${upcomingGames.length} Upcoming` : 'Fixtures'}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => go(volleyballPaths.join())}
              className="text-xs h-9 font-semibold"
            >
              <KeyRound className="mr-1.5 h-3.5 w-3.5" />
              <span>Join with Code</span>
            </Button>
            <Button
              size="sm"
              onClick={() => go(volleyballPaths.create)}
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
          formatBadge={`${formatFormat(nextUpcomingGame.players_per_side)} • ${nextUpcomingGame.capacity} players`}
          title={nextUpcomingGame.title}
          subtitle={nextUpcomingGame.is_organizer ? 'Organized by You' : 'Volleyball Match'}
          dateText={formatDate(nextUpcomingGame.starts_at)}
          venueText={nextUpcomingGame.venue}
          lineupText="Teams & Lineup"
          rsvpText="RSVP & Details"
          onLineup={() => go(volleyballPaths.game(nextUpcomingGame.game_id))}
          onRsvp={() => go(volleyballPaths.game(nextUpcomingGame.game_id))}
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
              ? 'No Upcoming Volleyball Matches'
              : 'No Past Matches'
          }
          description={
            activeTab === 'upcoming'
              ? 'Schedule a volleyball match or enter an invite code to join your squad on the court.'
              : 'Completed matches will appear here.'
          }
          icon={<CalendarDays className="h-6 w-6 text-primary" />}
          actionText={activeTab === 'upcoming' ? 'Schedule Match' : undefined}
          onAction={activeTab === 'upcoming' ? () => go(volleyballPaths.create) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeGamesList.map((g) => (
            <MatchFixtureCard
              key={g.game_id}
              formatBadge={`${formatFormat(g.players_per_side)} • ${g.capacity} players`}
              status={g.status}
              title={g.title}
              subtitle={g.is_organizer ? 'Organized by You' : 'Volleyball Fixture'}
              dateText={formatDate(g.starts_at)}
              venueText={g.venue}
              playingCount={g.playing_count}
              capacity={g.capacity}
              lineupText="Teams"
              rsvpText="RSVP"
              onLineup={() => go(volleyballPaths.game(g.game_id))}
              onRsvp={() => go(volleyballPaths.game(g.game_id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
