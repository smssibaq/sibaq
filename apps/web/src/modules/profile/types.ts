export type SkillLevel = 'beginner' | 'casual' | 'intermediate' | 'advanced';
export interface SportCatalogItem {
  key: string; name: string; emoji: string | null; role_label: string;
  max_roles: number; roles: Array<{key: string; label: string}>;
  is_team_sport: boolean; is_enabled: boolean; sort_order: number;
}
export interface PlayerSportInput {
  sport: string; skill_level: SkillLevel; roles: string[]; is_primary: boolean;
}
export interface PlayerProfile {
  id: string; display_name: string | null; avatar_url: string | null;
  home_area: string | null; bio: string | null; is_me: boolean; onboarding_completed: boolean;
  sports: Array<PlayerSportInput & {
    name: string; emoji: string | null; role_label: string; role_labels: string[];
    is_enabled: boolean; games_played: number; upcoming_games: number | null;
  }>;
  my_rating: {average: number | null; count: number} | null;
}
export interface ProfileDraft {
  displayName: string; homeArea: string; bio: string; avatarUrl: string | null; sports: PlayerSportInput[];
}
