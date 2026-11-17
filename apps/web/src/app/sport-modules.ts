import type { ComponentType } from 'react';
import type { SportKey } from '@/types/database.types';
import type { SportModule } from '@/types/sport-module';

/**
 * Sport modules are discovered at build time: any `modules/<sport>/index.ts` that exports
 * an object shaped like SportModule gets routes. Sports without a module show "Coming soon".
 * Football is not a SportModule — it keeps its own routes (/matches, /squads/...).
 */
export type LoadedSportModule = SportModule & {
  /** Optional extra pages a module may expose (e.g. volleyball create/join). */
  CreatePage?: ComponentType;
  JoinPage?: ComponentType;
  routes?: { game?: string; create?: string; join?: string };
};

const found = import.meta.glob<Record<string, unknown>>('../modules/*/index.ts', { eager: true });

function isSportModule(value: unknown): value is LoadedSportModule {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.key === 'string' &&
    typeof v.basePath === 'string' &&
    v.basePath.startsWith('/') &&
    typeof v.HubPage === 'function' &&
    typeof v.GamePage === 'function'
  );
}

export const sportModules: LoadedSportModule[] = Object.values(found)
  .flatMap((mod) => Object.values(mod))
  .filter(isSportModule)
  .filter((m, i, all) => all.findIndex((x) => x.key === m.key) === i);

export function getSportModule(key: SportKey | string): LoadedSportModule | undefined {
  return sportModules.find((m) => m.key === key);
}

/** Hub path for a sport (football keeps /matches). Null when the sport has no module yet. */
export function sportHubPath(key: SportKey | string): string | null {
  if (key === 'football') return '/matches';
  return getSportModule(key)?.basePath ?? null;
}

/** Detail path for a game of any sport. */
export function gamePath(sport: SportKey | string, gameId: string): string | null {
  if (sport === 'football') return `/matches/${gameId}`;
  const mod = getSportModule(sport);
  if (!mod) return null;
  if (mod.routes?.game) return mod.routes.game.replace('$gameId', gameId);
  return `${mod.basePath}/${gameId}`;
}
