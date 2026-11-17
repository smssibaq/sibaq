import { supabase } from '@/infrastructure/supabase/client';
import type { Squad, SquadMember, SquadRole, SquadService, MembershipService, SquadDetail } from './types';
import type { MembershipStatus, FootballPosition } from '@/types/contracts';
import { normalizeRoomCode } from '../invitations/schema';

export const squadApi: SquadService &
  MembershipService & {
    getSquadDetail(squadId: string): Promise<SquadDetail | null>;
    rejectMember(squadId: string, userId: string): Promise<void>;
    leaveSquad(squadId: string, userId: string): Promise<void>;
  } = {
  // 1. Create Squad via verified RPC
  async createSquad(name: string, description?: string): Promise<string> {
    const { data, error } = await supabase.rpc('create_squad', {
      p_name: name.trim(),
      p_description: description ? description.trim() : null,
    });
    if (error) throw error;
    return data;
  },

  // 2. Get Squad basic details
  async getSquad(squadId: string): Promise<Squad | null> {
    const { data, error } = await supabase
      .from('squads')
      .select('id, name, description, owner_id, join_code, created_at')
      .eq('id', squadId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      ownerId: data.owner_id,
      joinCode: data.join_code,
      createdAt: data.created_at,
    };
  },

  // 3. Get Squad detailed view with counts & viewer permissions
  async getSquadDetail(squadId: string): Promise<SquadDetail | null> {
    const { data: squad, error: squadError } = await supabase
      .from('squads')
      .select('id, name, description, owner_id, join_code, created_at')
      .eq('id', squadId)
      .maybeSingle();

    if (squadError) throw squadError;
    if (!squad) return null;

    // Fetch members to compute counts and viewer permissions
    const { data: members, error: membersError } = await supabase
      .from('squad_members')
      .select('user_id, role, status')
      .eq('squad_id', squadId);

    if (membersError) throw membersError;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const currentMember = members?.find((m) => m.user_id === user?.id);
    const activeMembers = members?.filter((m) => m.status === 'active') || [];
    const pendingMembers = members?.filter((m) => m.status === 'pending') || [];

    const isOwner = squad.owner_id === user?.id || currentMember?.role === 'owner';
    const isAdmin = currentMember?.role === 'admin';
    const canManage = isOwner || isAdmin;

    return {
      id: squad.id,
      name: squad.name,
      description: squad.description,
      ownerId: squad.owner_id,
      joinCode: squad.join_code,
      createdAt: squad.created_at,
      memberCount: activeMembers.length,
      activeMemberCount: activeMembers.length,
      pendingMemberCount: pendingMembers.length,
      currentUserRole: currentMember ? (currentMember.role as SquadRole) : undefined,
      currentUserStatus: currentMember ? (currentMember.status as MembershipStatus) : undefined,
      isOwner,
      isAdmin,
      canManage,
    };
  },

  // 4. List squads for current user with accurate active member count and user role
  async listMySquads(): Promise<Squad[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: memberRows, error: memberError } = await supabase
      .from('squad_members')
      .select('squad_id, role, status')
      .eq('user_id', user.id);

    if (memberError) throw memberError;
    if (!memberRows || memberRows.length === 0) return [];

    const squadIds = memberRows.map((m) => m.squad_id);
    const { data: squadsData, error: squadsError } = await supabase
      .from('squads')
      .select('id, name, description, owner_id, join_code, created_at')
      .in('id', squadIds);

    if (squadsError) throw squadsError;

    // Fetch member counts for these squads
    const { data: allMembers, error: allMembersError } = await supabase
      .from('squad_members')
      .select('squad_id, status')
      .in('squad_id', squadIds)
      .eq('status', 'active');

    const countMap = new Map<string, number>();
    if (!allMembersError && allMembers) {
      for (const m of allMembers) {
        countMap.set(m.squad_id, (countMap.get(m.squad_id) || 0) + 1);
      }
    }

    return (squadsData || []).map((s) => {
      const mem = memberRows.find((m) => m.squad_id === s.id);
      return {
        id: s.id,
        name: s.name,
        description: s.description,
        ownerId: s.owner_id,
        joinCode: s.join_code,
        createdAt: s.created_at,
        role: mem?.role as SquadRole,
        memberCount: countMap.get(s.id) || 1,
      };
    });
  },

  // 5. Join squad by room code via verified RPC (16-char code)
  async joinSquadByCode(code: string): Promise<string> {
    const cleanCode = normalizeRoomCode(code);
    const { data, error } = await supabase.rpc('join_squad', {
      p_code: cleanCode,
    });
    if (error) throw error;
    return data;
  },

  // 6. Update squad details
  async updateSquad(squadId: string, updates: { name?: string; description?: string }): Promise<void> {
    // Attempt via RPC if available
    if (updates.name) {
      const untypedClient = supabase as unknown as {
        rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: unknown }>;
      };
      const rpcRes = await untypedClient.rpc('update_squad_settings', {
        p_squad: squadId,
        p_name: updates.name.trim(),
        p_description: updates.description ? updates.description.trim() : null,
      });

      if (!rpcRes.error) {
        return;
      }
    }

    // Direct table update fallback
    const { error } = await supabase
      .from('squads')
      .update({
        ...(updates.name && { name: updates.name.trim() }),
        ...(updates.description !== undefined && { description: updates.description.trim() || null }),
      })
      .eq('id', squadId);

    if (error) throw error;
  },

  // 7. List members of squad with profile
  async listMembers(squadId: string): Promise<SquadMember[]> {
    const { data, error } = await supabase
      .from('squad_members')
      .select('squad_id, user_id, role, status, joined_at')
      .eq('squad_id', squadId);

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const userIds = data.map((d) => d.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, preferred_position')
      .in('id', userIds);

    const mapped = data.map((m) => {
      const prof = profiles?.find((p) => p.id === m.user_id);
      return {
        squadId: m.squad_id,
        userId: m.user_id,
        role: m.role as SquadRole,
        status: m.status as MembershipStatus,
        joinedAt: m.joined_at,
        profile: prof
          ? {
              id: prof.id,
              displayName: prof.display_name,
              avatarUrl: prof.avatar_url,
              preferredPosition: (prof.preferred_position as FootballPosition | null) || null,
              createdAt: '',
              updatedAt: '',
            }
          : null,
      };
    });

    // Sort order: Active before Pending; Owner -> Admin -> Player; Alphabetical by name
    const roleWeight: Record<SquadRole, number> = { owner: 1, admin: 2, player: 3 };
    return mapped.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'active' ? -1 : 1;
      }
      const roleDiff = roleWeight[a.role] - roleWeight[b.role];
      if (roleDiff !== 0) return roleDiff;
      const nameA = a.profile?.displayName || '';
      const nameB = b.profile?.displayName || '';
      return nameA.localeCompare(nameB);
    });
  },

  // 8. Approve pending member via verified RPC
  async approveMember(squadId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('approve_member', {
      p_squad: squadId,
      p_user: userId,
    });
    if (error) throw error;
  },

  // 9. Reject pending member (removes their pending record)
  async rejectMember(squadId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('remove_squad_member', {
      p_squad: squadId,
      p_user: userId,
    });
    if (error) throw error;
  },

  // 10. Set member role via verified RPC (owner only)
  async setMemberRole(squadId: string, userId: string, role: SquadRole): Promise<void> {
    const { error } = await supabase.rpc('set_member_role', {
      p_squad: squadId,
      p_user: userId,
      p_role: role,
    });
    if (error) throw error;
  },

  // 11. Remove member via verified RPC
  async removeMember(squadId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('remove_squad_member', {
      p_squad: squadId,
      p_user: userId,
    });
    if (error) throw error;
  },

  // 12. Transfer ownership via verified RPC
  async transferOwnership(squadId: string, newOwnerId: string): Promise<void> {
    const { error } = await supabase.rpc('transfer_squad_owner', {
      p_squad: squadId,
      p_new_owner: newOwnerId,
    });
    if (error) throw error;
  },

  // 13. Leave squad (remove current user from squad)
  async leaveSquad(squadId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('remove_squad_member', {
      p_squad: squadId,
      p_user: userId,
    });
    if (error) throw error;
  },
};
