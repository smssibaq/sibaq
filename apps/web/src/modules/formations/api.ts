import { supabase } from '@/infrastructure/supabase/client';
import type { FormationService } from './types';
import type { Json } from '@/types/database.types';
import { AppError } from '@/lib/errors';
import { GOALKEEPER_DUPLICATE_MESSAGE } from './schema';

export const formationApi: FormationService = {
  // Save formation positions with revision checking and goalkeeper enforcement
  async saveFormation(params: {
    teamId: string;
    formation: string;
    expectedRevision: number;
    positions: Array<{
      userId: string;
      positionLabel: string;
      isSubstitute: boolean;
      pitchX: number | null;
      pitchY: number | null;
    }>;
  }): Promise<number> {
    const gkCount = params.positions.filter(
      (p) => p.positionLabel?.trim().toUpperCase() === 'GK'
    ).length;

    if (gkCount > 1) {
      throw new AppError(GOALKEEPER_DUPLICATE_MESSAGE, 'CONFLICT', 409);
    }

    const formattedPositions = params.positions.map((p) => ({
      user_id: p.userId,
      position_label: p.positionLabel,
      is_substitute: p.isSubstitute,
      pitch_x: p.pitchX,
      pitch_y: p.pitchY,
    }));

    const { data, error } = await supabase.rpc('save_team_formation', {
      p_team: params.teamId,
      p_formation: params.formation,
      p_expected_revision: params.expectedRevision,
      p_positions: formattedPositions as unknown as Json,
    });

    if (error) {
      if (
        error.code === '23505' ||
        error.message?.includes('goalkeeper') ||
        error.details?.includes('goalkeeper') ||
        error.message?.includes('unique_goalkeeper_per_team') ||
        error.details?.includes('unique_goalkeeper_per_team')
      ) {
        throw new AppError(GOALKEEPER_DUPLICATE_MESSAGE, 'CONFLICT', 409);
      }
      throw error;
    }
    return typeof data === 'number' ? data : params.expectedRevision + 1;
  },
};
