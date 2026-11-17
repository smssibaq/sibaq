import { createRoute, type AnyRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '../auth/protected-route';
import { CricketHubPage } from './pages/CricketHubPage';
import { CricketCreatePage } from './pages/CricketCreatePage';
import { CricketJoinPage } from './pages/CricketJoinPage';
import { CricketGamePage } from './pages/CricketGamePage';

export const CRICKET_PATHS = {
  home: '/cricket',
  create: '/cricket/create',
  join: '/cricket/join',
  game: '/cricket/games/$gameId',
} as const;

const guard = (C: React.ComponentType) => () => (
  <ProtectedRoute>
    <C />
  </ProtectedRoute>
);

export function createCricketRoutes(rootRoute: AnyRoute) {
  return [
    createRoute({
      getParentRoute: () => rootRoute,
      path: CRICKET_PATHS.home,
      component: guard(CricketHubPage),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: CRICKET_PATHS.create,
      component: guard(CricketCreatePage),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: CRICKET_PATHS.join,
      component: guard(CricketJoinPage),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: CRICKET_PATHS.game,
      component: () => {
        const pathParts = window.location.pathname.split('/');
        const gameId = pathParts[pathParts.length - 1] || '';
        return (
          <ProtectedRoute>
            <CricketGamePage gameId={gameId} />
          </ProtectedRoute>
        );
      },
    }),
  ];
}
