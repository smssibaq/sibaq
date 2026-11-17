import { supabase } from '@/infrastructure/supabase/client';
import type { SquadInvitation, InvitationService } from './types';
import { normalizeRoomCode } from './schema';

export const invitationApi: InvitationService & {
  buildInviteUrl(token: string): string;
} = {
  // 1. Create invite token via verified RPC with multi-level resilient fallback
  async createInvite(squadId: string): Promise<string> {
    if (!squadId) {
      throw new Error('Squad ID is required to generate an invitation link.');
    }

    // Attempt 1: Call create_squad_invite RPC
    try {
      const { data, error } = await supabase.rpc('create_squad_invite', {
        p_squad: squadId,
      });

      if (!error && data && typeof data === 'string' && data.trim().length > 0) {
        return data.trim();
      }
    } catch {
      // Continue to resilient fallbacks
    }

    // Attempt 2: Retrieve an active invitation token from squad_invitations
    try {
      const { data: activeInvites } = await supabase
        .from('squad_invitations')
        .select('id, expires_at, revoked_at')
        .eq('squad_id', squadId)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (activeInvites && activeInvites.length > 0 && activeInvites[0].id) {
        return activeInvites[0].id;
      }
    } catch {
      // Continue to squad join code
    }

    // Attempt 3: Retrieve the squad's permanent room code (guaranteed on all squads)
    try {
      const { data: squad } = await supabase
        .from('squads')
        .select('join_code')
        .eq('id', squadId)
        .maybeSingle();

      if (squad?.join_code) {
        return squad.join_code;
      }
    } catch {
      // Final fallback
    }

    // Attempt 4: Fallback to squad ID
    return squadId;
  },

  // 2. Join squad via invite token via verified RPC with room code fallback
  async joinByInvite(token: string): Promise<string> {
    const cleanToken = token ? token.trim() : '';
    if (!cleanToken) {
      throw new Error('Please provide a valid invitation token.');
    }

    // Attempt 1: Call join_squad_by_invite RPC
    try {
      const { data, error } = await supabase.rpc('join_squad_by_invite', {
        p_token: cleanToken,
      });

      if (!error && data) {
        return data;
      }

      // Propagate already member or pending message
      if (error) {
        const msg = error.message || '';
        if (error.code === '23505' || msg.toLowerCase().includes('already')) {
          throw new Error('Already a squad member (23505)');
        }
      }
    } catch (rpcErr: unknown) {
      const msg = rpcErr instanceof Error ? rpcErr.message : String(rpcErr);
      if (msg.includes('23505') || msg.toLowerCase().includes('already')) {
        throw rpcErr;
      }
    }

    // Attempt 2: Fall back to join_squad RPC with room code
    try {
      const cleanCode = normalizeRoomCode(cleanToken);
      const { data: squadId, error: codeErr } = await supabase.rpc('join_squad', {
        p_code: cleanCode,
      });

      if (!codeErr && squadId) {
        return squadId;
      }

      if (codeErr) {
        const msg = codeErr.message || '';
        if (codeErr.code === '23505' || msg.toLowerCase().includes('already')) {
          throw new Error('Already a squad member (23505)');
        }
      }
    } catch (codeErr: unknown) {
      const msg = codeErr instanceof Error ? codeErr.message : String(codeErr);
      if (msg.includes('23505') || msg.toLowerCase().includes('already')) {
        throw codeErr;
      }
    }

    throw new Error('This invitation link has expired or is invalid.');
  },

  // 3. List invites for squad
  async listInvites(squadId: string): Promise<SquadInvitation[]> {
    try {
      const { data, error } = await supabase
        .from('squad_invitations')
        .select('id, squad_id, created_by, expires_at, revoked_at, created_at')
        .eq('squad_id', squadId)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) return [];
      return (data || []).map((d) => ({
        id: d.id,
        squadId: d.squad_id,
        createdBy: d.created_by,
        expiresAt: d.expires_at,
        revokedAt: d.revoked_at,
        createdAt: d.created_at,
      }));
    } catch {
      return [];
    }
  },

  // 4. Revoke invite
  async revokeInvite(inviteId: string): Promise<void> {
    const untypedClient = supabase as unknown as {
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: unknown }>;
    };
    const rpcRes = await untypedClient.rpc('revoke_squad_invite', {
      p_invite: inviteId,
    });

    if (!rpcRes.error) {
      return;
    }

    // Direct table update fallback
    const { error } = await supabase
      .from('squad_invitations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', inviteId);

    if (error) throw error;
  },

  // Helper to build canonical invite URL
  buildInviteUrl(token: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/invite/${encodeURIComponent(token.trim())}`;
  },
};
