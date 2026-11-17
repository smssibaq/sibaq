import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui';
import { PageHeader } from '@/components/common/page-header';
import { FeaturedFixtureCard } from '@/components/common/match-center-ui';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeError } from '@/lib/errors';
import { useCricketGames } from '../api';
import { CricketGameCard } from '../components/CricketGameCard';
import { cricketPaths, formatFormat, useCricketNav } from '../utils';

type Filter = 'upcoming' | 'hosting' | 'joined' | 'past';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'hosting', label: 'Hosting' },
  { key: 'joined', label: 'Joined' },
  { key: 'past', label: 'Past' },
];



export function CricketHubPage() {
  const go = useCricketNav();
  const { data, isLoading, error, refetch, isRefetching } = useCricketGames();
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);

  const games = useMemo(() => {
    const all = data ?? [];

    const isPast = (g: (typeof all)[number]) =>
      g.status === 'completed' ||
      g.status === 'cancelled' ||
      new Date(g.starts_at).getTime() < now;
    switch (filter) {
      case 'hosting':
        return all.filter((g) => g.is_organizer && !isPast(g));
      case 'joined':
        return all.filter((g) => g.my_status !== null && !g.is_organizer && !isPast(g));
      case 'past':
        return all.filter(isPast).reverse();
      default:
        return all.filter((g) => !isPast(g));
    }
  }, [data, filter, now]);

  const nextGame = (data ?? []).filter(g => g.status === 'scheduled' && new Date(g.starts_at).getTime() >= now).sort((a,b) => new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime())[0];
  return (
    <div className="space-y-4">
      <PageHeader
        title="Cricket Match Center"
        description="Create a game, share the code, confirm your squad, and head to the pitch."
        actions={
          <>
            <Button size="sm" className="min-h-11" variant="outline" onClick={() => go(cricketPaths.join())}>
              <KeyRound className="mr-1.5 h-3.5 w-3.5" />
              Join
            </Button>
            <Button size="sm" className="min-h-11" onClick={() => go(cricketPaths.create)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create game
            </Button>
          </>
        }
      />

      {nextGame && <FeaturedFixtureCard startsAt={nextGame.starts_at} formatBadge={formatFormat(nextGame.players_per_side, nextGame.overs_per_innings)} title={nextGame.title} subtitle={nextGame.is_organizer ? 'Organized by You' : 'Cricket Match'} dateText={new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }).format(new Date(nextGame.starts_at))} venueText={nextGame.venue ?? ''} lineupText="Tactical Field" rsvpText="Match Details" onLineup={() => go(cricketPaths.game(nextGame.game_id))} onRsvp={() => go(cricketPaths.game(nextGame.game_id))} />}
      <div className="grid grid-cols-4 gap-1.5" role="tablist" aria-label="Filter games">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={clsx(
              'min-h-11 rounded-full border px-1 text-xs font-semibold transition-colors truncate',
              filter === f.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-surface text-muted-foreground border-border hover:bg-surface-subtle'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div role="status" aria-label="Loading cricket games" className="grid gap-3 sm:grid-cols-2">{[0,1,2,3].map(key => <Skeleton key={key} className="h-48 w-full" />)}</div>
      ) : error ? (
        <ErrorState
          message={normalizeError(error).message}
          code={normalizeError(error).code}
          onRetry={() => refetch()}
          isRetrying={isRefetching}
        />
      ) : games.length === 0 ? (
        <EmptyState
          title={filter === 'past' ? 'No past games' : 'No games here yet'}
          description={
            filter === 'past'
              ? 'Completed and cancelled games show up here.'
              : 'Create a game and share the invitation code, or join one with a code.'
          }
          actionText={filter === 'past' ? undefined : 'Create game'}
          onAction={filter === 'past' ? undefined : () => go(cricketPaths.create)}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {games.map((g) => (
            <CricketGameCard key={g.game_id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}
