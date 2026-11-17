import { create } from 'zustand';
import type { Team, FormationPlayer, PitchCoordinate, FormationPreset, MatchAttendance } from '../types';
import {
  inferTacticalZone,
  FORMATION_PRESETS,
  autoPopulateSquadLineup,
  findPresetForFormat,
  formatFromPlayersPerTeam,
} from '../presets';

export interface FormationEditorState {
  selectedTeamId: string | null;
  selectedFormat: '5v5' | '6v6' | '7v7' | 'custom';
  matchPlayersPerTeam?: number;
  formationName: string;
  baseRevision: number;
  isDirty: boolean;

  draftPlayers: FormationPlayer[];
  serverPlayers: FormationPlayer[];
  teamDrafts: Record<
    string,
    {
      baseRevision?: number;
      draftPlayers: FormationPlayer[];
      formationName: string;
      isDirty: boolean;
      selectedFormat: '5v5' | '6v6' | '7v7' | 'custom';
    }
  >;

  activeDragUserId: string | null;
  swapTargetUserId: string | null;
  selectedBenchUserId: string | null;
  selectedPitchUserId: string | null;
  validationError: string | null;

  // Actions
  setValidationError: (error: string | null) => void;
  clearValidationError: () => void;
  updatePlayerPosition: (userId: string, newPosition: string) => boolean;
  removePlayerFromOtherDrafts: (userId: string, targetTeamId: string) => void;
  hydrateFromServer: (team: Team, matchPlayersPerTeam?: number, squadPlayers?: MatchAttendance[]) => void;
  autoFillSquad: (squadPlayers: MatchAttendance[]) => void;
  deployPlayerToPitch: (player: FormationPlayer | MatchAttendance) => void;
  addPlayerToBench: (player: FormationPlayer | MatchAttendance) => void;
  setSelectedTeamId: (teamId: string, team?: Team, squadPlayers?: MatchAttendance[]) => void;
  setSelectedFormat: (format: '5v5' | '6v6' | '7v7' | 'custom') => void;
  movePlayerCoordinate: (userId: string, coordinate: PitchCoordinate) => void;
  swapPlayers: (userIdA: string, userIdB: string) => void;
  toggleSubstitute: (userId: string) => void;
  applyFormationPreset: (preset: FormationPreset) => void;
  resetDraft: () => void;
  setSavedRevision: (newRevision: number) => void;
  setActiveDrag: (userId: string | null) => void;
  setSwapTarget: (userId: string | null) => void;
  setSelectedBench: (userId: string | null) => void;
  setSelectedPitch: (userId: string | null) => void;
}

export const useFormationStore = create<FormationEditorState>((set, get) => ({
  selectedTeamId: null,
  selectedFormat: '7v7',
  matchPlayersPerTeam: undefined,
  formationName: '2-3-1 Balanced (7s)',
  baseRevision: 1,
  isDirty: false,

  draftPlayers: [],
  serverPlayers: [],
  teamDrafts: {},

  activeDragUserId: null,
  swapTargetUserId: null,
  selectedBenchUserId: null,
  selectedPitchUserId: null,
  validationError: null,

  setValidationError: (error: string | null) => set({ validationError: error }),
  clearValidationError: () => set({ validationError: null }),

  updatePlayerPosition: (userId: string, newPosition: string) => {
    const state = get();
    const isTargetGk = newPosition.trim().toUpperCase() === 'GK';

    if (isTargetGk) {
      const alreadyHasGk = state.draftPlayers.some(
        (p) => p.userId !== userId && p.positionLabel?.trim().toUpperCase() === 'GK'
      );
      if (alreadyHasGk) {
        set({
          validationError: 'This team already has a goalkeeper. Only one goalkeeper is allowed per team.',
        });
        return false;
      }
    }

    const updated = state.draftPlayers.map((p) => {
      if (p.userId !== userId) return p;
      return {
        ...p,
        positionLabel: newPosition,
      };
    });

    set({
      draftPlayers: updated,
      isDirty: true,
      validationError: null,
    });
    return true;
  },

  removePlayerFromOtherDrafts: (userId: string, targetTeamId: string) => {
    set((state) => {
      const updatedDrafts = { ...state.teamDrafts };
      for (const tId of Object.keys(updatedDrafts)) {
        if (tId !== targetTeamId && updatedDrafts[tId]) {
          updatedDrafts[tId] = {
            ...updatedDrafts[tId],
            draftPlayers: updatedDrafts[tId].draftPlayers.filter((p) => p.userId !== userId),
          };
        }
      }
      return { teamDrafts: updatedDrafts };
    });
  },

  hydrateFromServer: (team: Team, matchPlayersPerTeam?: number, squadPlayers?: MatchAttendance[]) => {
    const effectivePlayersPerTeam = matchPlayersPerTeam ?? get().matchPlayersPerTeam;

    // Determine initial format from match playersPerTeam, formation string, or player count
    let format: '5v5' | '6v6' | '7v7' = '7v7';
    if (effectivePlayersPerTeam !== undefined) {
      format = formatFromPlayersPerTeam(effectivePlayersPerTeam);
    } else if (team.formation) {
      if (
        team.formation.includes('(5s)') ||
        team.formation.includes('5v5') ||
        team.formation.startsWith('1-2-1') ||
        team.formation.startsWith('2-2') ||
        team.formation.startsWith('1-1-2')
      ) {
        format = '5v5';
      } else if (
        team.formation.includes('(6s)') ||
        team.formation.includes('6v6') ||
        team.formation.startsWith('2-2-1') ||
        team.formation.startsWith('1-3-1') ||
        team.formation.startsWith('2-1-2')
      ) {
        format = '6v6';
      } else {
        format = '7v7';
      }
    }

    const activePreset = findPresetForFormat(format, team.formation);
    const effectiveFormation = team.formation || activePreset.name;
    const eligible = squadPlayers ? new Set(squadPlayers.filter(p => p.status === 'playing').map(p => p.userId)) : null;
    const teamPlayers = (team.players || []).filter(p => !eligible || eligible.has(p.userId));
    const processedPlayers = teamPlayers.map(p => ({ ...p, coordinate: p.coordinate ? { ...p.coordinate } : null }));
    const initialDirty = false;

    // Deep equality check against current draftPlayers to break re-render loops
    const current = get();

    if (
      current.selectedTeamId === team.id &&
      current.baseRevision === team.revision &&
      current.formationName === effectiveFormation &&
      current.selectedFormat === format &&
      current.draftPlayers.length === processedPlayers.length
    ) {
      const isIdentical = processedPlayers.every((p, idx) => {
        const cur = current.draftPlayers[idx];
        if (!cur) return false;
        return (
          cur.userId === p.userId &&
          cur.isSubstitute === p.isSubstitute &&
          cur.positionLabel === p.positionLabel &&
          cur.coordinate?.x === p.coordinate?.x &&
          cur.coordinate?.y === p.coordinate?.y
        );
      });

      if (isIdentical && !current.isDirty) {
        return; // Exact match, skip state update to break loop!
      }
    }

    set({
      selectedTeamId: team.id,
      selectedFormat: format,
      matchPlayersPerTeam: effectivePlayersPerTeam,
      formationName: effectiveFormation,
      baseRevision: team.revision,
      draftPlayers: processedPlayers,
      serverPlayers: teamPlayers.length > 0 ? processedPlayers : [],
      isDirty: initialDirty,
      activeDragUserId: null,
      swapTargetUserId: null,
      selectedBenchUserId: null,
      selectedPitchUserId: null,
    });
  },

  autoFillSquad: (squadPlayers: MatchAttendance[]) => {
    const state = get();
    const teamId = state.selectedTeamId;
    if (!teamId) return;

    const activePreset = findPresetForFormat(
      state.selectedFormat === 'custom' ? '7v7' : state.selectedFormat,
      state.formationName
    );

    const otherTeamAssigned = new Set<string>();
    Object.keys(state.teamDrafts).forEach((tId) => {
      if (tId !== teamId) {
        state.teamDrafts[tId]?.draftPlayers.forEach((p) => otherTeamAssigned.add(p.userId));
      }
    });

    const availableSquad = squadPlayers.filter((sp) => !otherTeamAssigned.has(sp.userId));
    const populated = autoPopulateSquadLineup(availableSquad, activePreset, teamId);

    set({
      draftPlayers: populated,
      isDirty: true,
      selectedBenchUserId: null,
      selectedPitchUserId: null,
      activeDragUserId: null,
      swapTargetUserId: null,
    });
  },

  setSelectedTeamId: (newTeamId: string, team?: Team, squadPlayers?: MatchAttendance[]) => {
    const state = get();
    const prevTeamId = state.selectedTeamId;

    // Preserve previous team's draft if dirty
    const updatedDrafts = { ...state.teamDrafts };
    if (prevTeamId && state.isDirty) {
      updatedDrafts[prevTeamId] = {
        baseRevision: state.baseRevision,
        draftPlayers: state.draftPlayers,
        formationName: state.formationName,
        isDirty: state.isDirty,
        selectedFormat: state.selectedFormat,
      };
    }

    // Strict team isolation: ensure no players in new team's draft belong to another team
    const otherTeamAssigned = new Set<string>();
    for (const tId of Object.keys(updatedDrafts)) {
      if (tId !== newTeamId && updatedDrafts[tId]) {
        updatedDrafts[tId].draftPlayers.forEach((p) => otherTeamAssigned.add(p.userId));
      }
    }

    // Check if new team already has a preserved local draft
    if (updatedDrafts[newTeamId]) {
      const saved = updatedDrafts[newTeamId];
      // Strip out any players assigned to another team
      const isolatedDraftPlayers = saved.draftPlayers.filter(
        (p) => !otherTeamAssigned.has(p.userId)
      );

      set({
        selectedTeamId: newTeamId,
        draftPlayers: isolatedDraftPlayers,
        formationName: saved.formationName,
        isDirty: saved.isDirty,
        selectedFormat: saved.selectedFormat,
        teamDrafts: updatedDrafts,
        baseRevision: saved.baseRevision ?? team?.revision ?? state.baseRevision,
        activeDragUserId: null,
        swapTargetUserId: null,
        selectedBenchUserId: null,
        selectedPitchUserId: null,
      });
      return;
    }

    set({ teamDrafts: updatedDrafts });

    if (team) {
      get().hydrateFromServer(team, get().matchPlayersPerTeam, squadPlayers);
    } else {
      set({ selectedTeamId: newTeamId, draftPlayers: [], isDirty: false });
    }
  },

  deployPlayerToPitch: (player: FormationPlayer | MatchAttendance) => {
    const state = get();
    const targetTeamId = state.selectedTeamId || '';

    // Enforce single-team membership: remove player from other team drafts
    const updatedDrafts = { ...state.teamDrafts };
    for (const tId of Object.keys(updatedDrafts)) {
      if (tId !== targetTeamId && updatedDrafts[tId]) {
        updatedDrafts[tId] = {
          ...updatedDrafts[tId],
          draftPlayers: updatedDrafts[tId].draftPlayers.filter((p) => p.userId !== player.userId),
        };
      }
    }

    const currentDraft = [...state.draftPlayers];
    const existingIndex = currentDraft.findIndex((p) => p.userId === player.userId);

    const activePreset =
      FORMATION_PRESETS.find((p) => p.name === state.formationName) ||
      FORMATION_PRESETS.find((p) => p.format === state.selectedFormat) ||
      FORMATION_PRESETS[0];

    const hasGk = currentDraft.some(
      (p) => p.userId !== player.userId && p.positionLabel?.trim().toUpperCase() === 'GK'
    );

    const starters = currentDraft.filter((p) => !p.isSubstitute && p.coordinate !== null);
    const availableSlot = activePreset.positions.find((slot) => {
      // If team already has GK, do not assign to GK slot
      if (hasGk && slot.label === 'GK') return false;
      return !starters.some((st) => {
        if (!st.coordinate) return false;
        const dx = st.coordinate.x - slot.x;
        const dy = st.coordinate.y - slot.y;
        return Math.sqrt(dx * dx + dy * dy) < 10;
      });
    });

    const targetCoord = availableSlot
      ? { x: availableSlot.x, y: availableSlot.y }
      : { x: 50, y: Math.max(15, Math.min(85, 30 + starters.length * 10)) };

    const isFormation = 'positionLabel' in player;
    let candidatePos = isFormation ? player.positionLabel : player.profile?.preferredPosition;
    if (hasGk && candidatePos?.trim().toUpperCase() === 'GK') {
      candidatePos = 'DEF';
    }

    let targetLabel = availableSlot?.label || candidatePos || 'MID';
    if (hasGk && targetLabel.trim().toUpperCase() === 'GK') {
      targetLabel = 'DEF';
    }

    const name = (isFormation ? player.displayName : player.profile?.displayName) || 'Player';
    const avatarUrl = (isFormation ? player.avatarUrl : player.profile?.avatarUrl) || null;

    if (existingIndex >= 0) {
      currentDraft[existingIndex] = {
        ...currentDraft[existingIndex],
        coordinate: targetCoord,
        positionLabel: targetLabel,
        isSubstitute: false,
      };
    } else {
      currentDraft.push({
        userId: player.userId,
        teamId: targetTeamId,
        positionLabel: targetLabel,
        isSubstitute: false,
        coordinate: targetCoord,
        displayName: name,
        avatarUrl,
      });
    }

    set({
      draftPlayers: currentDraft,
      teamDrafts: updatedDrafts,
      isDirty: true,
      selectedBenchUserId: null,
      selectedPitchUserId: null,
    });
  },

  addPlayerToBench: (player: FormationPlayer | MatchAttendance) => {
    const state = get();
    const targetTeamId = state.selectedTeamId || '';

    // Enforce single-team membership: remove player from other team drafts
    const updatedDrafts = { ...state.teamDrafts };
    for (const tId of Object.keys(updatedDrafts)) {
      if (tId !== targetTeamId && updatedDrafts[tId]) {
        updatedDrafts[tId] = {
          ...updatedDrafts[tId],
          draftPlayers: updatedDrafts[tId].draftPlayers.filter((p) => p.userId !== player.userId),
        };
      }
    }

    const currentDraft = [...state.draftPlayers];
    const existingIndex = currentDraft.findIndex((p) => p.userId === player.userId);

    const isFormation = 'positionLabel' in player;
    const name = (isFormation ? player.displayName : player.profile?.displayName) || 'Player';
    const avatarUrl = (isFormation ? player.avatarUrl : player.profile?.avatarUrl) || null;

    if (existingIndex >= 0) {
      currentDraft[existingIndex] = {
        ...currentDraft[existingIndex],
        coordinate: null,
        positionLabel: 'SUB',
        isSubstitute: true,
      };
    } else {
      currentDraft.push({
        userId: player.userId,
        teamId: targetTeamId,
        positionLabel: 'SUB',
        isSubstitute: true,
        coordinate: null,
        displayName: name,
        avatarUrl,
      });
    }

    set({
      draftPlayers: currentDraft,
      teamDrafts: updatedDrafts,
      isDirty: true,
      selectedBenchUserId: null,
      selectedPitchUserId: null,
    });
  },

  setSelectedFormat: (format) => {
    const state = get();
    // If match has a designated playersPerTeam, enforce lock to match fixture level
    if (state.matchPlayersPerTeam !== undefined) {
      const lockedFormat = formatFromPlayersPerTeam(state.matchPlayersPerTeam);
      set({ selectedFormat: lockedFormat });
      return;
    }
    set({ selectedFormat: format });
  },

  movePlayerCoordinate: (userId, coordinate) => {
    // Clamp to pitch safety boundary [6, 94]
    const clampedX = Math.max(6, Math.min(94, Math.round(coordinate.x)));
    const clampedY = Math.max(6, Math.min(94, Math.round(coordinate.y)));

    set((state) => {
      const currentZone = inferTacticalZone(clampedY);
      const isTargetGk = currentZone === 'GK';

      const alreadyHasOtherGk =
        isTargetGk &&
        state.draftPlayers.some(
          (p) => p.userId !== userId && p.positionLabel?.trim().toUpperCase() === 'GK'
        );

      let updatedY = clampedY;
      let updatedZone = currentZone;
      let errorToSet: string | null = null;

      if (alreadyHasOtherGk) {
        // Prevent assigning a second goalkeeper: clamp to defender zone and alert
        updatedZone = 'DEF';
        updatedY = Math.min(clampedY, 83);
        errorToSet = 'This team already has a goalkeeper. Only one goalkeeper is allowed per team.';
      }

      const updated = state.draftPlayers.map((player) => {
        if (player.userId !== userId) return player;

        // Auto-infer position label if currently a standard tag
        let updatedLabel = player.positionLabel;
        if (['GK', 'DEF', 'MID', 'ATT', 'SUB', 'CB', 'LB', 'RB', 'CM', 'ST', 'LW', 'RW'].includes(player.positionLabel)) {
          updatedLabel = updatedZone;
        }

        return {
          ...player,
          coordinate: { x: clampedX, y: updatedY },
          positionLabel: updatedLabel,
          isSubstitute: false,
        };
      });

      return {
        draftPlayers: updated,
        isDirty: true,
        validationError: errorToSet,
      };
    });
  },

  swapPlayers: (userIdA, userIdB) => {
    if (userIdA === userIdB) return;

    set((state) => {
      const playerA = state.draftPlayers.find((p) => p.userId === userIdA);
      const playerB = state.draftPlayers.find((p) => p.userId === userIdB);

      if (!playerA || !playerB) return state;

      const updated = state.draftPlayers.map((p) => {
        if (p.userId === userIdA) {
          return {
            ...p,
            coordinate: playerB.coordinate ? { ...playerB.coordinate } : null,
            positionLabel: playerB.positionLabel,
            isSubstitute: playerB.isSubstitute,
          };
        }
        if (p.userId === userIdB) {
          return {
            ...p,
            coordinate: playerA.coordinate ? { ...playerA.coordinate } : null,
            positionLabel: playerA.positionLabel,
            isSubstitute: playerA.isSubstitute,
          };
        }
        return p;
      });

      return {
        draftPlayers: updated,
        isDirty: true,
        swapTargetUserId: null,
        selectedBenchUserId: null,
        selectedPitchUserId: null,
      };
    });
  },

  toggleSubstitute: (userId) => {
    set((state) => {
      const target = state.draftPlayers.find((p) => p.userId === userId);
      if (!target) return state;

      const willBeSub = !target.isSubstitute;

      const updated = state.draftPlayers.map((p) => {
        if (p.userId !== userId) return p;

        if (willBeSub) {
          // Move from pitch to bench
          return {
            ...p,
            isSubstitute: true,
            coordinate: null,
            positionLabel: 'SUB',
          };
        } else {
          // Move from bench to open slot or center pitch
          return {
            ...p,
            isSubstitute: false,
            coordinate: { x: 50, y: 50 },
            positionLabel: 'MID',
          };
        }
      });

      return {
        draftPlayers: updated,
        isDirty: true,
        selectedBenchUserId: null,
        selectedPitchUserId: null,
      };
    });
  },

  applyFormationPreset: (preset) => {
    set((state) => {
      // Sort existing active pitch players: GK first, then outfielders by ascending y (top to bottom)
      const currentStarters = state.draftPlayers.filter((p) => !p.isSubstitute);
      const currentBench = state.draftPlayers.filter((p) => p.isSubstitute);

      // Separate GK if present
      const gk = currentStarters.find((p) => p.positionLabel === 'GK' || (p.coordinate && p.coordinate.y > 80));
      const outfielders = currentStarters.filter((p) => p !== gk);

      const orderedStarters = gk ? [gk, ...outfielders] : outfielders;

      // Map up to preset position count
      const updatedStarters: FormationPlayer[] = [];
      const movedToBench: FormationPlayer[] = [];

      orderedStarters.forEach((player, idx) => {
        const targetPos = preset.positions[idx];
        if (targetPos) {
          updatedStarters.push({
            ...player,
            coordinate: { x: targetPos.x, y: targetPos.y },
            positionLabel: targetPos.label,
            isSubstitute: false,
          });
        } else {
          // Overflow players moved to bench
          movedToBench.push({
            ...player,
            coordinate: null,
            positionLabel: 'SUB',
            isSubstitute: true,
          });
        }
      });

      // If bench has players and preset still has unfilled positions, promote from bench
      const remainingBench = [...currentBench, ...movedToBench];
      let benchIdx = 0;

      while (updatedStarters.length < preset.positions.length && benchIdx < remainingBench.length) {
        const candidate = remainingBench[benchIdx];
        const targetPos = preset.positions[updatedStarters.length];
        if (candidate && targetPos) {
          updatedStarters.push({
            ...candidate,
            coordinate: { x: targetPos.x, y: targetPos.y },
            positionLabel: targetPos.label,
            isSubstitute: false,
          });
          remainingBench.splice(benchIdx, 1);
        } else {
          benchIdx++;
        }
      }

      const finalDraft = [...updatedStarters, ...remainingBench];

      return {
        draftPlayers: finalDraft,
        formationName: preset.name,
        selectedFormat: preset.format,
        isDirty: true,
        selectedBenchUserId: null,
        selectedPitchUserId: null,
      };
    });
  },

  resetDraft: () => {
    const currentTeamId = get().selectedTeamId;
    set((state) => {
      const updatedDrafts = { ...state.teamDrafts };
      if (currentTeamId) delete updatedDrafts[currentTeamId];
      return {
        draftPlayers: [...state.serverPlayers],
        isDirty: false,
        teamDrafts: updatedDrafts,
        selectedBenchUserId: null,
        selectedPitchUserId: null,
        swapTargetUserId: null,
        activeDragUserId: null,
      };
    });
  },

  setSavedRevision: (newRevision) => {
    const currentTeamId = get().selectedTeamId;
    set((state) => {
      const updatedDrafts = { ...state.teamDrafts };
      if (currentTeamId) delete updatedDrafts[currentTeamId];
      return {
        baseRevision: newRevision,
        serverPlayers: [...state.draftPlayers],
        isDirty: false,
        teamDrafts: updatedDrafts,
      };
    });
  },

  setActiveDrag: (userId) => set({ activeDragUserId: userId }),
  setSwapTarget: (userId) => set({ swapTargetUserId: userId }),
  setSelectedBench: (userId) => set({ selectedBenchUserId: userId }),
  setSelectedPitch: (userId) => set({ selectedPitchUserId: userId }),
}));
