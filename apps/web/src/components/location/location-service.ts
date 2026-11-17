import { supabase } from '@/infrastructure/supabase/client';
export interface GameLocation { name: string; address: string; latitude: number | null; longitude: number | null }
export const manualLocation = (name = ''): GameLocation => ({ name, address: '', latitude: null, longitude: null });
export function hasCoordinates(value: GameLocation): boolean { return value.latitude !== null && value.longitude !== null && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) && Math.abs(value.latitude) <= 90 && Math.abs(value.longitude) <= 180; }
export function directionsUrl(value: GameLocation) { return hasCoordinates(value) ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${value.latitude},${value.longitude}`)}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.name)}`; }
type Client = { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string; message: string } | null }> };
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> { const { data,error } = await (supabase as unknown as Client).rpc(name,args); if (error) throw new Error(error.code === 'PGRST202' ? 'Apply the game_locations SQL migration to save map locations.' : error.message); return data as T; }
export async function getGameLocation(gameId: string): Promise<GameLocation | null> {
 const { data,error } = await (supabase as unknown as Client).rpc('get_game_location',{ p_game:gameId });
 if(error?.code === 'PGRST202') return null;
 if(error) throw new Error(error.message);
 return data as GameLocation | null;
}
export const saveGameLocation = (gameId: string,location: GameLocation) => rpc<void>('set_game_location',{ p_game:gameId,p_location:location });
export async function createWithLocation(sport: string,args: Record<string,unknown>,location?: GameLocation): Promise<string> {
 if(location && (hasCoordinates(location) || location.address.trim())) return rpc<string>('create_game_with_location',{ p_sport:sport,p_args:args,p_location:location });
 return rpc<string>(sport === 'football' ? 'create_match' : `${sport}_create_game`,args);
}

export const updateWithLocation = (gameId:string,args:Record<string,unknown>,location:GameLocation) => rpc<void>('update_game_with_location',{p_game:gameId,p_changes:args,p_location:location});
