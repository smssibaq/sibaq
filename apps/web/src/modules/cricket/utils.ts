import { useRouter } from '@tanstack/react-router';

export const CRICKET_BASE_PATH = '/cricket';

export const cricketPaths = {
  hub: '/cricket',
  create: '/cricket/create',
  join: (code?: string) =>
    code ? `/cricket/join?code=${encodeURIComponent(code)}` : '/cricket/join',
  game: (id: string) => `/cricket/games/${id}`,
};

/** Untyped navigation: the router tree is owned by Dev A, so paths here can't be type-checked against it. */
export function useCricketNav() {
  const router = useRouter();
  return (path: string) => router.history.push(path);
}

export type CricketDisplayStatus = 'upcoming' | 'ready' | 'completed' | 'cancelled';

/**
 * Formats the match format string, e.g. "6v6 · 10 overs" or "6v6" when overs is 0.
 */
export function formatFormat(playersPerSide: number, overs: number): string {
  const base = `${playersPerSide}v${playersPerSide}`;
  return overs > 0 ? `${base} · ${overs} ov` : `${base} · open`;
}

/**
 * Derives a display status from stored status + headcount.
 * "ready" means the squad is full and the game is still scheduled.
 */
export function deriveDisplayStatus(
  status: string,
  confirmed: number,
  capacity: number
): CricketDisplayStatus {
  if (status === 'cancelled') return 'cancelled';
  if (status === 'completed') return 'completed';
  return confirmed >= capacity ? 'ready' : 'upcoming';
}

export const DISPLAY_STATUS_LABEL: Record<CricketDisplayStatus, string> = {
  upcoming: 'Upcoming',
  ready: 'Squad Full',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
