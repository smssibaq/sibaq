// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This is an Edge Function template for server-side trusted logic and secrets.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Verify Authentication Header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Initialize Supabase Client with service_role key for trusted server logic
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server environment not properly configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Verify user token
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired user session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Parse and validate payload
    const body = await req.json().catch(() => ({}));
    const { action, payload } = body;

    if (!action || typeof action !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Action parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Example trusted operation
    return new Response(
      JSON.stringify({
        success: true,
        message: `Edge function executed action "${action}" successfully for user ${user.id}.`,
        timestamp: new Date().toISOString(),
        echo: payload,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

