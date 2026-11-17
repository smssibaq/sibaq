import type { ComponentType } from 'react';
import type { SportKey } from './database.types';

/**
 * Contract every sport module exposes from `modules/<sport>/index.ts`.
 * Developer A wires these into the sport navigation; B and C only export them.
 *
 *   // modules/cricket/index.ts
 *   export const cricketModule: SportModule = {
 *     key: 'cricket',
 *     label: 'Cricket',
 *     basePath: '/cricket',
 *     HubPage: CricketHubPage,           // list + create games
 *     GamePage: CricketGamePage,         // receives { gameId }
 *   };
 */
export interface SportModule {
  key: SportKey;
  label: string;
  /** Route prefix owned by the module, e.g. '/cricket'. */
  basePath: `/${string}`;
  /** Game list / create screen for the sport. */
  HubPage: ComponentType;
  /** Single game screen. */
  GamePage: ComponentType<{ gameId: string }>;
  /** Optional icon component (lucide-react icons fit). */
  Icon?: ComponentType<{ className?: string }>;
}
