import type { ComponentType } from 'react';
import { CricketHubPage } from './pages/CricketHubPage';
import { CricketGamePage } from './pages/CricketGamePage';
import { CricketCreatePage } from './pages/CricketCreatePage';
import { CricketJoinPage } from './pages/CricketJoinPage';
import { CricketIcon } from './icon';
import { CRICKET_BASE_PATH } from './utils';

export { CricketHubPage, CricketGamePage, CricketCreatePage, CricketJoinPage };
export { CRICKET_BASE_PATH, cricketPaths } from './utils';
export { createCricketRoutes, CRICKET_PATHS } from './routes';
export { CricketIcon } from './icon';

/**
 * Structurally matches the SportModule contract in the multisport architecture
 * ({ key, label, basePath, HubPage, GamePage, Icon? }); CreatePage and JoinPage are extras.
 */
export const cricketModule = {
  key: 'cricket' as const,
  label: 'Cricket',
  basePath: CRICKET_BASE_PATH as `/${string}`,
  HubPage: CricketHubPage as ComponentType,
  GamePage: CricketGamePage as ComponentType<{ gameId: string }>,
  Icon: CricketIcon,
  CreatePage: CricketCreatePage as ComponentType,
  JoinPage: CricketJoinPage as ComponentType,
  routes: {
    hub: '/cricket',
    create: '/cricket/create',
    join: '/cricket/join',
    game: '/cricket/games/$gameId',
  },
};
