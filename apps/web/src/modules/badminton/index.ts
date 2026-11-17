import type { SportModule } from '@/types/sport-module';
import { BadmintonHubPage } from './badminton-hub-page';
import { BadmintonGamePage } from './badminton-game-page';
import { ShuttleIcon } from './icon';

export const badmintonModule: SportModule = {
  key: 'badminton',
  label: 'Badminton',
  basePath: '/badminton',
  HubPage: BadmintonHubPage,
  GamePage: BadmintonGamePage,
  Icon: ShuttleIcon,
};

export { BadmintonHubPage, BadmintonGamePage };
