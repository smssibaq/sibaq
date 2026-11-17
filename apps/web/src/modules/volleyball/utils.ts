import { useRouter } from '@tanstack/react-router';
import type { VolleyballDbStatus } from '@/types/sports/volleyball.db';

export const VOLLEYBALL_BASE_PATH = '/volleyball';

export const volleyballPaths = {
  hub: VOLLEYBALL_BASE_PATH,
  create: `${VOLLEYBALL_BASE_PATH}/create`,
  join: (code?: string) => (code ? `${VOLLEYBALL_BASE_PATH}/join?code=${encodeURIComponent(code)}` : `${VOLLEYBALL_BASE_PATH}/join`),
  game: (gameId: string) => `${VOLLEYBALL_BASE_PATH}/games/${gameId}`,
};

/** Untyped navigation: the router tree is owned by Dev A, so paths here can't be type-checked against it. */
export function useVolleyballNav() {
  const router = useRouter();
  return (path: string) => router.history.push(path);
}

export type VolleyballDisplayStatus = 'upcoming' | 'ready' | 'completed' | 'cancelled';

/** Readiness is derived from confirmed players, never stored. */
export function deriveDisplayStatus(
  status: VolleyballDbStatus,
  playingCount: number,
  capacity: number
): VolleyballDisplayStatus {
  if (status === 'cancelled') return 'cancelled';
  if (status === 'completed') return 'completed';
  return playingCount >= capacity ? 'ready' : 'upcoming';
}

export const DISPLAY_STATUS_LABEL: Record<VolleyballDisplayStatus, string> = {
  upcoming: 'Upcoming',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function readinessText(playingCount: number, capacity: number): string {
  const remaining = capacity - playingCount;
  if (remaining <= 0) return `${playingCount} / ${capacity} confirmed — Ready to Play`;
  return `${playingCount} / ${capacity} confirmed — ${remaining} more needed`;
}

export function formatFormat(playersPerSide: number): string {
  return `${playersPerSide}v${playersPerSide}`;
}

export function inviteLink(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${volleyballPaths.join(code)}`;
}

export function whatsappShareUrl(title: string, code: string): string {
  const text = `Join our volleyball game "${title}" on Kalikkanundo: ${inviteLink(code)} (code ${code})`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
