/**
 * Cricket database types — owned by Developer B. Only cricket_* tables and RPCs go here.
 * Merged into Database['public'] by ../database.types.ts, so supabase.from('cricket_games')
 * and supabase.rpc('cricket_create_game', ...) are fully typed.
 *
 * Shape (same as generated Supabase types):
 *   export type CricketTables = {
 *     cricket_games: { Row: {...}; Insert: {...}; Update: {...}; Relationships: [] };
 *   };
 *   export type CricketFunctions = {
 *     cricket_create_game: { Args: {...}; Returns: string };
 *   };
 */
export type CricketTables = Record<never, never>;
export type CricketFunctions = Record<never, never>;
