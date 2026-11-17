import type { FormationPreset, TacticalZone, FormationPlayer, MatchAttendance } from './types';

export const FORMATION_PRESETS: FormationPreset[] = [
  // 5v5 Formations
  {
    id: '5-1-2-1',
    name: '1-2-1 Diamond (5s)',
    format: '5v5',
    description: 'Classic small-sided tactical diamond offering wing balance and pivot striker support.',
    positions: [
      { label: 'GK', x: 50, y: 91 },
      { label: 'CB', x: 32, y: 68 },
      { label: 'CB', x: 68, y: 68 },
      { label: 'CM', x: 50, y: 44 },
      { label: 'ST', x: 50, y: 16 },
    ],
  },
  {
    id: '5-2-2',
    name: '2-2 Box (5s)',
    format: '5v5',
    description: 'Solid dual-block formation ideal for high pressing and compact transition play.',
    positions: [
      { label: 'GK', x: 50, y: 91 },
      { label: 'LB', x: 28, y: 68 },
      { label: 'RB', x: 72, y: 68 },
      { label: 'LM', x: 28, y: 26 },
      { label: 'RM', x: 72, y: 26 },
    ],
  },
  {
    id: '5-1-1-2',
    name: '1-1-2 Attack (5s)',
    format: '5v5',
    description: 'High offensive overload with two inverted forwards and an anchor defender.',
    positions: [
      { label: 'GK', x: 50, y: 91 },
      { label: 'CB', x: 50, y: 68 },
      { label: 'CM', x: 50, y: 46 },
      { label: 'LW', x: 28, y: 18 },
      { label: 'RW', x: 72, y: 18 },
    ],
  },

  // 6v6 Formations
  {
    id: '6-2-2-1',
    name: '2-2-1 Balanced (6s)',
    format: '6v6',
    description: 'Two defenders, two box-to-box midfielders, and a target forward.',
    positions: [
      { label: 'GK', x: 50, y: 92 },
      { label: 'LB', x: 28, y: 70 },
      { label: 'RB', x: 72, y: 70 },
      { label: 'LM', x: 28, y: 44 },
      { label: 'RM', x: 72, y: 44 },
      { label: 'ST', x: 50, y: 16 },
    ],
  },
  {
    id: '6-1-3-1',
    name: '1-3-1 Control (6s)',
    format: '6v6',
    description: 'Midfield supremacy with wide outlets and a central playmaker.',
    positions: [
      { label: 'GK', x: 50, y: 92 },
      { label: 'CB', x: 50, y: 72 },
      { label: 'LM', x: 20, y: 46 },
      { label: 'CM', x: 50, y: 46 },
      { label: 'RM', x: 80, y: 46 },
      { label: 'ST', x: 50, y: 16 },
    ],
  },
  {
    id: '6-2-1-2',
    name: '2-1-2 Attack (6s)',
    format: '6v6',
    description: 'Aggressive twin-striker setup underpinned by an energetic defensive midfielder.',
    positions: [
      { label: 'GK', x: 50, y: 92 },
      { label: 'LB', x: 28, y: 70 },
      { label: 'RB', x: 72, y: 70 },
      { label: 'CM', x: 50, y: 48 },
      { label: 'LW', x: 28, y: 18 },
      { label: 'RW', x: 72, y: 18 },
    ],
  },

  // 7v7 Formations
  {
    id: '7-2-3-1',
    name: '2-3-1 Balanced (7s)',
    format: '7v7',
    description: 'The golden standard 7-a-side shape providing width, depth, and defensive cover.',
    positions: [
      { label: 'GK', x: 50, y: 92 },
      { label: 'LB', x: 26, y: 72 },
      { label: 'RB', x: 74, y: 72 },
      { label: 'LM', x: 20, y: 46 },
      { label: 'CM', x: 50, y: 48 },
      { label: 'RM', x: 80, y: 46 },
      { label: 'ST', x: 50, y: 15 },
    ],
  },
  {
    id: '7-3-2-1',
    name: '3-2-1 Solid (7s)',
    format: '7v7',
    description: 'Impenetrable three-man backline with dual central midfielders.',
    positions: [
      { label: 'GK', x: 50, y: 92 },
      { label: 'LB', x: 22, y: 72 },
      { label: 'CB', x: 50, y: 74 },
      { label: 'RB', x: 78, y: 72 },
      { label: 'CM', x: 36, y: 46 },
      { label: 'CM', x: 64, y: 46 },
      { label: 'ST', x: 50, y: 15 },
    ],
  },
  {
    id: '7-2-2-2',
    name: '2-2-2 Box (7s)',
    format: '7v7',
    description: 'Balanced dual-box system providing two banks of two with twin center-forwards.',
    positions: [
      { label: 'GK', x: 50, y: 92 },
      { label: 'LB', x: 28, y: 72 },
      { label: 'RB', x: 72, y: 72 },
      { label: 'LM', x: 30, y: 46 },
      { label: 'RM', x: 70, y: 46 },
      { label: 'ST', x: 34, y: 16 },
      { label: 'ST', x: 66, y: 16 },
    ],
  },
  {
    id: '7-1-3-2',
    name: '1-3-2 Attack (7s)',
    format: '7v7',
    description: 'Dynamic single pivot with triple midfield playmakers supporting a dual strike partnership.',
    positions: [
      { label: 'GK', x: 50, y: 92 },
      { label: 'CB', x: 50, y: 74 },
      { label: 'LM', x: 20, y: 46 },
      { label: 'CM', x: 50, y: 48 },
      { label: 'RM', x: 80, y: 46 },
      { label: 'ST', x: 34, y: 16 },
      { label: 'ST', x: 66, y: 16 },
    ],
  },
  {
    id: '7-2-1-3',
    name: '2-1-3 All-Out (7s)',
    format: '7v7',
    description: 'Front-foot pressing with a trident attack for maximum goal threat.',
    positions: [
      { label: 'GK', x: 50, y: 92 },
      { label: 'LB', x: 28, y: 72 },
      { label: 'RB', x: 72, y: 72 },
      { label: 'CM', x: 50, y: 50 },
      { label: 'LW', x: 20, y: 20 },
      { label: 'ST', x: 50, y: 14 },
      { label: 'RW', x: 80, y: 20 },
    ],
  },
];

/**
 * Automatically infers a player's tactical zone ('GK' | 'DEF' | 'MID' | 'ATT')
 * based on normalized vertical pitch percentage [0, 100] (where 100 is defending goal, 0 is attacking goal).
 */
export function inferTacticalZone(y: number): TacticalZone {
  if (y >= 84) return 'GK';
  if (y >= 60) return 'DEF';
  if (y >= 35) return 'MID';
  return 'ATT';
}

/**
 * Returns distinct styling tokens for each tactical zone
 */
export function getTacticalZoneStyle(zone: TacticalZone) {
  switch (zone) {
    case 'GK':
      return {
        badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        jerseyRing: 'ring-amber-400',
        cardGlow: 'shadow-[0_0_15px_rgba(245,158,11,0.25)]',
      };
    case 'DEF':
      return {
        badgeBg: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
        jerseyRing: 'ring-sky-400',
        cardGlow: 'shadow-[0_0_15px_rgba(56,189,248,0.25)]',
      };
    case 'MID':
      return {
        badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        jerseyRing: 'ring-emerald-400',
        cardGlow: 'shadow-[0_0_15px_rgba(34,197,94,0.25)]',
      };
    case 'ATT':
      return {
        badgeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        jerseyRing: 'ring-rose-400',
        cardGlow: 'shadow-[0_0_15px_rgba(239,68,68,0.25)]',
      };
  }
}

/**
 * Automatically builds an initial squad formation from confirmed match attendees.
 * - Sorts by attendance status (playing > maybe > unconfirmed) and confirmation timestamp
 * - Matches player preferredPosition to preset zones ('GK' -> 'DEF' -> 'MID' -> 'ATT')
 * - Enforces exactly 1 goalkeeper max
 * - Fills remaining open starter slots from remaining pool in confirmation order
 * - Moves all remaining confirmed players to the substitutes bench ('SUB')
 */
export function autoPopulateSquadLineup(
  squadMembers: MatchAttendance[],
  preset: FormationPreset,
  teamId: string
): FormationPlayer[] {
  // 1. Sort squad members by confirmation priority:
  //    - status: 'playing' (1), 'maybe' (2), 'unconfirmed' (3)
  //    - updatedAt: ascending timestamp (earlier confirmation first)
  const sortedMembers = [...squadMembers].sort((a, b) => {
    const statusWeight = (s: string) => (s === 'playing' ? 1 : s === 'maybe' ? 2 : 3);
    const weightDiff = statusWeight(a.status) - statusWeight(b.status);
    if (weightDiff !== 0) return weightDiff;
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return timeA - timeB;
  });

  const pool = [...sortedMembers];
  const targetSlots = preset.positions;
  const starters: (FormationPlayer | null)[] = new Array(targetSlots.length).fill(null);

  const createPlayerToken = (
    member: MatchAttendance,
    slot: { label: string; x: number; y: number } | null,
    isSub: boolean
  ): FormationPlayer => {
    const displayName =
      member.profile?.displayName ||
      (member as unknown as { displayName?: string }).displayName ||
      'Player';
    const avatarUrl = member.profile?.avatarUrl || null;
    return {
      userId: member.userId,
      teamId,
      positionLabel: isSub ? 'SUB' : (slot?.label || 'MID'),
      isSubstitute: isSub,
      coordinate: isSub || !slot ? null : { x: slot.x, y: slot.y },
      displayName,
      avatarUrl,
    };
  };

  const getSlotZone = (slot: { label: string; x: number; y: number }): TacticalZone => {
    const lbl = slot.label.toUpperCase();
    if (lbl === 'GK') return 'GK';
    if (['CB', 'LB', 'RB', 'SW', 'LWB', 'RWB'].includes(lbl)) return 'DEF';
    if (['CM', 'CDM', 'CAM', 'LM', 'RM'].includes(lbl)) return 'MID';
    if (['ST', 'CF', 'LW', 'RW', 'SS'].includes(lbl)) return 'ATT';
    return inferTacticalZone(slot.y);
  };

  // Step 2.1: Prioritize Goalkeeper (maximum 1 GK)
  const gkSlotIndex = targetSlots.findIndex(
    (s) => s.label.toUpperCase() === 'GK' || getSlotZone(s) === 'GK'
  );
  if (gkSlotIndex !== -1) {
    const gkCandidateIndex = pool.findIndex(
      (m) => m.profile?.preferredPosition?.toUpperCase() === 'GK'
    );
    if (gkCandidateIndex !== -1) {
      const [gkMember] = pool.splice(gkCandidateIndex, 1);
      starters[gkSlotIndex] = createPlayerToken(gkMember, targetSlots[gkSlotIndex], false);
    }
  }

  // Step 2.2: Fill outfield positions matching preferredPosition ('DEF', 'MID', 'ATT')
  for (let i = 0; i < targetSlots.length; i++) {
    if (starters[i] !== null) continue;
    const slot = targetSlots[i];
    const slotZone = getSlotZone(slot);

    const candIndex = pool.findIndex(
      (m) => m.profile?.preferredPosition?.toUpperCase() === slotZone
    );
    if (candIndex !== -1) {
      const [matchedMember] = pool.splice(candIndex, 1);
      starters[i] = createPlayerToken(matchedMember, slot, false);
    }
  }

  // Step 2.3: Fill remaining unfilled starter slots from remaining pool in confirmation order
  for (let i = 0; i < targetSlots.length; i++) {
    if (starters[i] === null && pool.length > 0) {
      const slot = targetSlots[i];
      const [nextMember] = pool.splice(0, 1);
      starters[i] = createPlayerToken(nextMember, slot, false);
    }
  }

  // Step 2.4: All remaining players in pool go to the substitution bench
  const substitutes: FormationPlayer[] = pool.map((member) =>
    createPlayerToken(member, null, true)
  );

  return [...starters.filter((p): p is FormationPlayer => p !== null), ...substitutes];
}

/**
 * Maps a match's playersPerTeam count to the corresponding tactical format.
 * <= 5 -> '5v5'
 * 6    -> '6v6'
 * >= 7 -> '7v7'
 */
export function formatFromPlayersPerTeam(playersPerTeam?: number | null): '5v5' | '6v6' | '7v7' {
  if (playersPerTeam === undefined || playersPerTeam === null) return '7v7';
  if (playersPerTeam <= 5) return '5v5';
  if (playersPerTeam === 6) return '6v6';
  return '7v7';
}

/**
 * Finds a formation preset strictly matching the desired format.
 * Matches by full name, preset id, or base formation code (e.g. '1-2-1', '2-3-1').
 * If the formation string is missing or belongs to a different format (e.g. '2-3-1' for a 5v5 game),
 * safely returns the primary default preset for that format.
 */
export function findPresetForFormat(
  format: '5v5' | '6v6' | '7v7',
  formationString?: string | null
): FormationPreset {
  const presetsForFormat = FORMATION_PRESETS.filter((p) => p.format === format);
  const defaultPreset = presetsForFormat[0] || FORMATION_PRESETS[0];

  if (!formationString || typeof formationString !== 'string') {
    return defaultPreset;
  }

  const trimmed = formationString.trim().toLowerCase();

  // 1. Exact match on preset name (case-insensitive)
  const exactName = presetsForFormat.find((p) => p.name.toLowerCase() === trimmed);
  if (exactName) return exactName;

  // 2. Exact match on preset id (case-insensitive)
  const exactId = presetsForFormat.find((p) => p.id.toLowerCase() === trimmed);
  if (exactId) return exactId;

  // 3. Match on base code (e.g. '1-2-1' matches '1-2-1 Diamond (5s)')
  const codeMatch = presetsForFormat.find((p) => {
    const baseCode = p.name.split(' ')[0].toLowerCase();
    return baseCode === trimmed || trimmed.startsWith(baseCode);
  });
  if (codeMatch) return codeMatch;

  // 4. Fallback to default preset for this format
  return defaultPreset;
}


