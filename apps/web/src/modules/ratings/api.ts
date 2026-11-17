import { supabase } from '@/infrastructure/supabase/client';

export const ratingsKeys = {
  summary: (gameId: string) => ['ratings', 'summary', gameId] as const,
  history: ['ratings', 'history'] as const,
};

export interface PlayerRatingSummary {
  player_id: string;
  display_name: string;
  avg: number | null;
  count: number;
  my_rating: number | null;
}

export interface GameRatingsSummary {
  is_organizer: boolean;
  is_participant: boolean;
  is_open: boolean;
  match_avg: number | null;
  match_count: number | null;
  my_review: { rating: number; feedback: string | null } | null;
  players: PlayerRatingSummary[] | null;
}

export const ratingsApi = {
  async getSummary(gameId: string): Promise<GameRatingsSummary> {
    const { data, error } = await supabase.rpc('get_game_ratings_summary', { p_game: gameId });
    if (error) throw error;
    return data as unknown as GameRatingsSummary;
  },
  async ratePlayer(gameId: string, playerId: string, rating: number): Promise<void> {
    const { error } = await supabase.rpc('rate_player', { p_game: gameId, p_player: playerId, p_rating: rating });
    if (error) throw error;
  },
  async reviewMatch(gameId: string, rating: number, feedback: string): Promise<void> {
    const { error } = await supabase.rpc('review_match', {
      p_game: gameId,
      p_rating: rating,
      p_feedback: feedback.trim() || null,
    });
    if (error) throw error;
  },
  async getMyHistory() {
    const { data, error } = await supabase.rpc('get_my_rating_history');
    if (error) throw error;
    return data ?? [];
  },
};
