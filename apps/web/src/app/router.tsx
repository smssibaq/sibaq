import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
  Navigate,
} from '@tanstack/react-router';
import { LoginPage } from '../modules/auth/login-page';
import { CallbackPage } from '../modules/auth/callback-page';
import { ProtectedRoute } from '../modules/auth/protected-route';
import { AdminRoute } from '../modules/auth/admin-route';
import { DashboardPage } from '../modules/dashboard/dashboard-page';
import { SampleItemsPage } from '../modules/sample-items/sample-items-page';
import { ProfilePage } from '../modules/auth/profile-page';
import { ProfileSetupPage } from '../modules/auth/profile-setup-page';
import { AdminPage } from '../modules/admin/admin-page';
import { NotFoundPage } from '../components/common/not-found';

// Kalikkanundo Modules
import { SquadNewPage } from '../modules/squads/squad-new-page';
import { SquadDetailPage } from '../modules/squads/squad-detail-page';
import { SquadMembersPage } from '../modules/squads/squad-members-page';
import { SquadSettingsPage } from '../modules/squads/squad-settings-page';
import { JoinPage } from '../modules/invitations/join-page';
import { InvitePage } from '../modules/invitations/invite-page';
import { MatchNewPage } from '../modules/matches/match-new-page';
import { MatchDetailPage } from '../modules/matches/match-detail-page';
import { MatchesHubPage } from '../modules/matches/matches-hub-page';
import { LineupEditorPage as LineupPage } from '../modules/teams/components/lineup-editor-page';
import { SquadHubPage } from '../modules/squad-hub';
import { OfflineIndicator } from '../components/pwa/offline-indicator';
import { PwaUpdatePrompt } from '../components/pwa/pwa-update-prompt';
import { PwaInstallPrompt } from '../components/pwa/pwa-install-prompt';
import type { ComponentType } from 'react';
import { useParams, type AnyRoute } from '@tanstack/react-router';
import { sportModules, type LoadedSportModule } from './sport-modules';

function RootComponent() {
  return (
    <>
      <Outlet />
      <OfflineIndicator />
      <PwaUpdatePrompt />
      <PwaInstallPrompt />
    </>
  );
}

// 1. Root Route
const rootRoute = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => <NotFoundPage />,
});

// 2. Index redirect to dashboard
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Navigate to="/dashboard" replace />,
});

// 3. Public Auth Routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const callbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  component: CallbackPage,
});

// 4. Protected Product Routes
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: () => (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  ),
});

// Kalikkanundo Routes
const squadsHubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/squads',
  component: () => (
    <ProtectedRoute>
      <SquadHubPage />
    </ProtectedRoute>
  ),
});

const squadNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/squads/new',
  component: () => (
    <ProtectedRoute>
      <SquadNewPage />
    </ProtectedRoute>
  ),
});

const squadDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/squads/$squadId',
  component: () => (
    <ProtectedRoute>
      <SquadDetailPage />
    </ProtectedRoute>
  ),
});

const squadMembersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/squads/$squadId/members',
  component: () => (
    <ProtectedRoute>
      <SquadMembersPage />
    </ProtectedRoute>
  ),
});

const squadSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/squads/$squadId/settings',
  component: () => (
    <ProtectedRoute>
      <SquadSettingsPage />
    </ProtectedRoute>
  ),
});

const squadMatchNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/squads/$squadId/matches/new',
  component: () => (
    <ProtectedRoute>
      <MatchNewPage />
    </ProtectedRoute>
  ),
});

const joinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/join',
  component: () => (
    <ProtectedRoute>
      <JoinPage />
    </ProtectedRoute>
  ),
});

const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invite/$token',
  component: () => (
    <ProtectedRoute>
      <InvitePage />
    </ProtectedRoute>
  ),
});

const matchesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/matches',
  component: () => (
    <ProtectedRoute>
      <MatchesHubPage />
    </ProtectedRoute>
  ),
});

const matchDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/matches/$matchId',
  component: () => (
    <ProtectedRoute>
      <MatchDetailPage />
    </ProtectedRoute>
  ),
});

const lineupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/matches/$matchId/lineup',
  component: () => (
    <ProtectedRoute>
      <LineupPage />
    </ProtectedRoute>
  ),
});

const sampleItemsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sample-items',
  component: () => (
    <ProtectedRoute>
      <SampleItemsPage />
    </ProtectedRoute>
  ),
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: () => (
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  ),
});

const profileSetupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile/setup',
  component: () => (
    <ProtectedRoute requireProfile={false} noLayout={true}>
      <ProfileSetupPage />
    </ProtectedRoute>
  ),
});

// 5. Admin Protected Route
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: () => (
    <AdminRoute>
      <AdminPage />
    </AdminRoute>
  ),
});

// 6. Sport modules (badminton, cricket, volleyball...) mounted from modules/*/index.ts
function SportGameRoute({ mod }: { mod: LoadedSportModule }) {
  const { gameId } = useParams({ strict: false }) as { gameId?: string };
  const GamePage = mod.GamePage;
  return (
    <ProtectedRoute>
      <GamePage gameId={gameId ?? ''} />
    </ProtectedRoute>
  );
}

function protectedPage(Page: ComponentType) {
  return function ProtectedSportPage() {
    return (
      <ProtectedRoute>
        <Page />
      </ProtectedRoute>
    );
  };
}

const sportRoutes = sportModules.flatMap((mod) => {
  const base = mod.basePath;
  const gamePaths = new Set<string>([`${base}/$gameId`]);
  if (mod.routes?.game) gamePaths.add(mod.routes.game);
  const routes: AnyRoute[] = [
    createRoute({ getParentRoute: () => rootRoute, path: base, component: protectedPage(mod.HubPage) }),
    ...[...gamePaths].map((path) =>
      createRoute({ getParentRoute: () => rootRoute, path, component: () => <SportGameRoute mod={mod} /> })
    ),
  ];
  if (mod.CreatePage) {
    routes.push(
      createRoute({
        getParentRoute: () => rootRoute,
        path: mod.routes?.create ?? `${base}/create`,
        component: protectedPage(mod.CreatePage),
      })
    );
  }
  if (mod.JoinPage) {
    routes.push(
      createRoute({
        getParentRoute: () => rootRoute,
        path: mod.routes?.join ?? `${base}/join`,
        component: protectedPage(mod.JoinPage),
      })
    );
  }
  return routes;
});

// 7. Assemble Route Tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  callbackRoute,
  dashboardRoute,
  squadsHubRoute,
  squadNewRoute,
  squadDetailRoute,
  squadMembersRoute,
  squadSettingsRoute,
  squadMatchNewRoute,
  joinRoute,
  inviteRoute,
  matchesRoute,
  matchDetailRoute,
  lineupRoute,
  sampleItemsRoute,
  profileRoute,
  profileSetupRoute,
  adminRoute,
  ...sportRoutes,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

// Register router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
