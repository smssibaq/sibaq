import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { Trophy } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/infrastructure/supabase/client';
import { getSportModule, sportHubPath } from '@/app/sport-modules';
import type { Database } from '@/types/database.types';
import { useAuth } from '@/modules/auth/auth-provider';

export type SportRow = Database['public']['Tables']['sports']['Row'];

export const sportsQueryKey = ['sports', 'all'] as const;

/** All registered sports (enabled first by sort order). */
export function useSports() {
  const { profile } = useAuth();
  const primary = profile?.sports.find(sport => sport.is_primary)?.sport;
  const query = useQuery({
    queryKey: sportsQueryKey,
    queryFn: async (): Promise<SportRow[]> => {
      const { data, error } = await supabase.from('sports').select('*').order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
  return { ...query, data: query.data ? [...query.data].sort((a, b) => Number(b.key === primary) - Number(a.key === primary)) : undefined };
}

/** A sport is playable when it is enabled in the DB and the app has routes for it. */
export function isSportAvailable(sport: SportRow): boolean {
  return sport.is_enabled && sportHubPath(sport.key) !== null;
}

/** Which sport's area the current path belongs to (null outside sport pages). */
export function activeSportForPath(pathname: string): string | null {
  if (pathname === '/matches' || pathname.startsWith('/matches/')) return 'football';
  const first = '/' + (pathname.split('/')[1] ?? '');
  for (const key of ['badminton', 'cricket', 'volleyball']) {
    if (getSportModule(key)?.basePath === first) return key;
  }
  return null;
}

export function SportSwitcher({ className }: { className?: string }) {
  const { data: sports = [] } = useSports();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = activeSportForPath(pathname);

  if (sports.length === 0) return null;

  return (
    <nav aria-label="Sports" className={clsx('-mx-3 sm:mx-0 overflow-x-auto', className)}>
      <ul className="flex gap-2 px-3 sm:px-0 pb-1 w-max">
        {sports.map((sport) => {
          const available = isSportAvailable(sport);
          const isActive = active === sport.key;
          const Icon = getSportModule(sport.key)?.Icon;
          return (
            <li key={sport.key}>
              <button
                type="button"
                disabled={!available}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  const path = sportHubPath(sport.key);
                  if (path) navigate({ to: path } as never);
                }}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-full border px-3.5 h-9 text-sm font-semibold whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : available
                    ? 'border-border bg-surface text-foreground hover:border-primary/60'
                    : 'border-dashed border-border text-muted-foreground opacity-70 cursor-not-allowed'
                )}
              >
                {Icon ? <Icon className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
                {sport.name}
                {!available && <span className="text-[10px] uppercase tracking-wider">Soon</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Cards for sports that are registered but not playable yet. */
export function ComingSoonSports() {
  const { data: sports = [] } = useSports();
  const soon = sports.filter((s) => !isSportAvailable(s));
  if (soon.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {soon.map((s) => (
        <div key={s.key} className="rounded-lg border border-dashed border-border p-4 text-sm">
          <p className="font-bold text-foreground">{s.name}</p>
          <p className="text-muted-foreground text-xs mt-1">Coming soon</p>
        </div>
      ))}
    </div>
  );
}
