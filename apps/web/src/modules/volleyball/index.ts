import type { ComponentType } from 'react';
import { VolleyballHubPage } from './pages/volleyball-hub-page';
import { VolleyballCreatePage } from './pages/volleyball-create-page';
import { VolleyballJoinPage } from './pages/volleyball-join-page';
import { VolleyballGamePage } from './pages/volleyball-game-page';
import { VOLLEYBALL_BASE_PATH } from './utils';

export { VolleyballHubPage, VolleyballCreatePage, VolleyballJoinPage, VolleyballGamePage };
export { VOLLEYBALL_BASE_PATH, volleyballPaths } from './utils';

/**
 * Structurally matches the SportModule contract in the playbook
 * ({ key, label, basePath, HubPage, GamePage, Icon? }); create/join pages are extras.
 */
export const volleyballModule = {
  key: 'volleyball' as const,
  label: 'Volleyball',
  basePath: VOLLEYBALL_BASE_PATH,
  HubPage: VolleyballHubPage as ComponentType,
  GamePage: VolleyballGamePage as ComponentType,
  CreatePage: VolleyballCreatePage as ComponentType,
  JoinPage: VolleyballJoinPage as ComponentType,
  routes: {
    hub: '/volleyball',
    create: '/volleyball/create',
    join: '/volleyball/join',
    game: '/volleyball/games/$gameId',
  },
};
