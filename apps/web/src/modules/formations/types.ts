export type {
  PitchCoordinate,
  FormationPlayer,
  FormationService,
} from '@/types/contracts';

export interface FormationPreset {
  id: string;
  name: string;
  format: '5v5' | '6v6' | '7v7';
  positions: Array<{ label: string; x: number; y: number }>;
}

export const FORMATION_PRESETS: FormationPreset[] = [
  // 5v5 Presets
  {
    id: '5-2-1-1',
    name: '2-1-1 Diamond (5s)',
    format: '5v5',
    positions: [
      { label: 'GK', x: 0.5, y: 0.1 },
      { label: 'CB', x: 0.35, y: 0.35 },
      { label: 'CB', x: 0.65, y: 0.35 },
      { label: 'CM', x: 0.5, y: 0.6 },
      { label: 'ST', x: 0.5, y: 0.85 },
    ],
  },
  {
    id: '5-1-2-1',
    name: '1-2-1 Box (5s)',
    format: '5v5',
    positions: [
      { label: 'GK', x: 0.5, y: 0.1 },
      { label: 'CB', x: 0.5, y: 0.35 },
      { label: 'LM', x: 0.25, y: 0.6 },
      { label: 'RM', x: 0.75, y: 0.6 },
      { label: 'ST', x: 0.5, y: 0.85 },
    ],
  },
  // 7v7 Presets
  {
    id: '7-2-3-1',
    name: '2-3-1 Classic (7s)',
    format: '7v7',
    positions: [
      { label: 'GK', x: 0.5, y: 0.08 },
      { label: 'LB', x: 0.3, y: 0.3 },
      { label: 'RB', x: 0.7, y: 0.3 },
      { label: 'LM', x: 0.2, y: 0.55 },
      { label: 'CM', x: 0.5, y: 0.55 },
      { label: 'RM', x: 0.8, y: 0.55 },
      { label: 'ST', x: 0.5, y: 0.85 },
    ],
  },
  {
    id: '7-3-2-1',
    name: '3-2-1 Solid (7s)',
    format: '7v7',
    positions: [
      { label: 'GK', x: 0.5, y: 0.08 },
      { label: 'LB', x: 0.25, y: 0.3 },
      { label: 'CB', x: 0.5, y: 0.28 },
      { label: 'RB', x: 0.75, y: 0.3 },
      { label: 'CM', x: 0.38, y: 0.58 },
      { label: 'CM', x: 0.62, y: 0.58 },
      { label: 'ST', x: 0.5, y: 0.85 },
    ],
  },
];
