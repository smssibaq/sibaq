import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://czhkpkhtpdafiiadvgje.supabase.co';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fVvf3BGpEVonkiEBm5BDvw_pv2_iFhz';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabasePublishableKey &&
    !supabaseUrl.includes('YOUR_PROJECT') &&
    !supabasePublishableKey.includes('YOUR_PUBLISHABLE_KEY')
);

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
