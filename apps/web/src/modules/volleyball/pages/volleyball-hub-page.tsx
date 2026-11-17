import { useMemo, useState } from 'react';
import { KeyRound, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { LoadingState } from '@/components/common/loading-state';
import { normalizeError } from '@/lib/errors';
import { useVolleyballGames } from '../hooks';
import { VolleyballGameCard } from '../components/VolleyballGameCard';
import { volleyballPaths, useVolleyballNav } from '../utils';

type Filter = 'upcoming' | 'hosting' | 'joined' | 'past';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'hosting', label: 'Hosting' },
  { key: 'joined', label: 'Joined' },
  { key: 'past', label: 'Past' },
];

const SIX_HOURS = 6 * 60 * 60 * 1000;

export function VolleyballHubPage() {
  const go = useVolleyballNav();
  const { data, isLoading, error, refetch, isRefetching } = useVolleyballGames();
  const [filter, setFilter] = useState<Filter>('upcoming');

  const games = useMemo(() => {
    const all = data ?? [];
    const now = Date.now();
    const isPast = (g: (typeof all)[number]) =>
      g.status === 'completed' || g.status === 'cancelled' || new Date(g.starts_at).getTime() < now - SIX_HOURS;
    switch (filter) {
      case 'hosting':
        return all.filter((g) => g.is_organizer && !isPast(g));
      case 'joined':
        return all.filter((g) => !g.is_organizer && !isPast(g));
      case 'past':
        return all.filter(isPast).reverse();
      default:
        return all.filter((g) => !isPast(g));
    }
  }, [data, filter]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Volleyball"
        description="Create a game, share the code, confirm 12 players, split teams."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => go(volleyballPaths.join())}>
              <KeyRound className="mr-1.5 h-3.5 w-3.5" />
              Join
            </Button>
            <Button size="sm" onClick={() => go(volleyballPaths.create)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create game
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-1.5" role="tablist" aria-label="Filter games">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={clsx(
              'h-9 rounded-full border px-1 text-xs font-semibold transition-colors truncate',
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
        <LoadingState message="Loading volleyball games..." />
      ) : error ? (
        <ErrorState message={normalizeError(error).message} code={normalizeError(error).code} onRetry={() => refetch()} isRetrying={isRefetching} />
      ) : games.length === 0 ? (
        <EmptyState
          title={filter === 'past' ? 'No past games' : 'No games here yet'}
          description={
            filter === 'past'
              ? 'Completed and cancelled games show up here.'
              : 'Create a game and share the invitation code, or join one with a code.'
          }
          actionText={filter === 'past' ? undefined : 'Create game'}
          onAction={filter === 'past' ? undefined : () => go(volleyballPaths.create)}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {games.map((g) => (
            <VolleyballGameCard key={g.game_id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}
