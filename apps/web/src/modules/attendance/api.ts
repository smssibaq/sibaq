import { supabase } from '@/infrastructure/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/infrastructure/query-keys';
import { useAuth } from '@/modules/auth/auth-provider';
import type {
  MatchAttendance,
  AttendanceStatus,
  ExtendedAttendanceService,
  MatchWaitlistEntry,
} from './types';
import type { FootballPosition } from '@/types/contracts';
import type { MatchDetail } from '@/modules/matches/types';

export const attendanceApi: ExtendedAttendanceService = {
  // 1. Set attendance via verified RPC with optional admin override
  async setAttendance(matchId: string, status: AttendanceStatus, adminOverride = false): Promise<void> {
    const { error } = await supabase.rpc('set_attendance', {
      p_match: matchId,
      p_status: status,
      p_admin_override: adminOverride,
    });
    if (error) throw error;
  },

  // 2. List attendance for match
  async listAttendance(matchId: string): Promise<MatchAttendance[]> {
    const { data, error } = await supabase
      .from('match_attendance')
      .select('match_id, user_id, status, updated_at')
      .eq('match_id', matchId);

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const userIds = data.map((d) => d.user_id);
    const { data: profiles } = userIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, preferred_position')
          .in('id', userIds)
      : { data: [] };

    return data.map((d) => {
      const prof = profiles?.find((p) => p.id === d.user_id);
      return {
        matchId: d.match_id,
        userId: d.user_id,
        status: d.status as AttendanceStatus,
        updatedAt: d.updated_at,
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
  },

  // 3. Get my attendance for match
  async getMyAttendance(matchId: string): Promise<AttendanceStatus | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('match_attendance')
      .select('status')
      .eq('match_id', matchId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return null;
    return data.status as AttendanceStatus;
  },

  // 4. Join waitlist via verified RPC
  async joinWaitlist(matchId: string): Promise<number> {
    const { data, error } = await supabase.rpc('join_waitlist', {
      p_match: matchId,
    });
    if (error) throw error;
    return Number(data);
  },

  // 5. Leave waitlist via verified RPC
  async leaveWaitlist(matchId: string): Promise<void> {
    const { error } = await supabase.rpc('leave_waitlist', {
      p_match: matchId,
    });
    if (error) throw error;
  },

  // 6. List waitlisted players in queue order
  async listWaitlist(matchId: string): Promise<MatchWaitlistEntry[]> {
    const { data, error } = await supabase
      .from('match_waitlist')
      .select('id, match_id, user_id, created_at')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const userIds = data.map((d) => d.user_id);
    const { data: profiles } = userIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, preferred_position')
          .in('id', userIds)
      : { data: [] };

    return data.map((d, index) => {
      const prof = profiles?.find((p) => p.id === d.user_id);
      return {
        id: d.id,
        matchId: d.match_id,
        userId: d.user_id,
        createdAt: d.created_at,
        queuePosition: index + 1,
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
  },

  // 7. Get caller's waitlist position
  async getMyWaitlistPosition(matchId: string): Promise<number | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const waitlist = await attendanceApi.listWaitlist(matchId);
    const myEntry = waitlist.find((w) => w.userId === user.id);
    return myEntry ? myEntry.queuePosition : null;
  },
};

// ============================================================================
// TanStack Query Hooks
// ============================================================================

export function useMatchAttendance(matchId: string) {
  return useQuery({
    queryKey: queryKeys.matches.attendance(matchId),
    queryFn: () => attendanceApi.listAttendance(matchId),
    enabled: Boolean(matchId),
  });
}

export function useMyAttendance(matchId: string) {
  return useQuery({
    queryKey: queryKeys.matches.myAttendance(matchId),
    queryFn: () => attendanceApi.getMyAttendance(matchId),
    enabled: Boolean(matchId),
  });
}

export function useMatchWaitlist(matchId: string) {
  return useQuery({
    queryKey: queryKeys.matches.waitlist(matchId),
    queryFn: () => attendanceApi.listWaitlist(matchId),
    enabled: Boolean(matchId),
  });
}

export function useMyWaitlistPosition(matchId: string) {
  return useQuery({
    queryKey: queryKeys.matches.myWaitlistPosition(matchId),
    queryFn: () => attendanceApi.getMyWaitlistPosition(matchId),
    enabled: Boolean(matchId),
  });
}

export function useSetAttendance() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: ({
      matchId,
      status,
      adminOverride = false,
    }: {
      matchId: string;
      status: AttendanceStatus;
      adminOverride?: boolean;
    }) => attendanceApi.setAttendance(matchId, status, adminOverride),

    onMutate: async ({ matchId, status: newStatus }) => {
      const myAttendanceKey = queryKeys.matches.myAttendance(matchId);
      const attendanceListKey = queryKeys.matches.attendance(matchId);
      const matchDetailKey = queryKeys.matches.detail(matchId);
      const waitlistKey = queryKeys.matches.waitlist(matchId);
      const myWaitlistKey = queryKeys.matches.myWaitlistPosition(matchId);

      // 1. Cancel any outgoing refetches for all relevant queries so they don't overwrite optimistic data
      await queryClient.cancelQueries({ queryKey: myAttendanceKey });
      await queryClient.cancelQueries({ queryKey: attendanceListKey });
      await queryClient.cancelQueries({ queryKey: matchDetailKey });
      await queryClient.cancelQueries({ queryKey: waitlistKey });
      await queryClient.cancelQueries({ queryKey: myWaitlistKey });

      // 2. Snapshot previous values for rollback
      const previousMyAttendance = queryClient.getQueryData<AttendanceStatus | null>(myAttendanceKey);
      const previousAttendanceList = queryClient.getQueryData<MatchAttendance[]>(attendanceListKey);
      const previousMatchDetail = queryClient.getQueryData<MatchDetail | null>(matchDetailKey);
      const previousWaitlist = queryClient.getQueryData<MatchWaitlistEntry[]>(waitlistKey);
      const previousMyWaitlist = queryClient.getQueryData<number | null>(myWaitlistKey);

      // 3. Optimistically set the user's RSVP status
      queryClient.setQueryData<AttendanceStatus | null>(myAttendanceKey, newStatus);

      // 4. Optimistically update attendance list (roster & counts)
      const currentUserId = user?.id;
      let nextAttendanceList: MatchAttendance[] = [];

      if (previousAttendanceList) {
        const existingIndex = currentUserId
          ? previousAttendanceList.findIndex((a) => a.userId === currentUserId)
          : -1;

        if (existingIndex >= 0) {
          nextAttendanceList = previousAttendanceList.map((a, idx) =>
            idx === existingIndex
              ? { ...a, status: newStatus, updatedAt: new Date().toISOString() }
              : a
          );
        } else if (currentUserId) {
          const newEntry: MatchAttendance = {
            matchId,
            userId: currentUserId,
            status: newStatus,
            updatedAt: new Date().toISOString(),
            profile: profile
              ? {
                  id: currentUserId,
                  displayName: profile.display_name || user?.email?.split('@')[0] || 'Player',
                  avatarUrl: profile.avatar_url || null,
                  preferredPosition: (profile.preferred_position || null) as FootballPosition | null,
                  createdAt: '',
                  updatedAt: '',
                }
              : null,
          };
          nextAttendanceList = [...previousAttendanceList, newEntry];
        } else {
          nextAttendanceList = previousAttendanceList;
        }

        queryClient.setQueryData<MatchAttendance[]>(attendanceListKey, nextAttendanceList);
      }

      // 5. Optimistically update match detail attendance counts
      if (previousMatchDetail && nextAttendanceList.length > 0) {
        const playing = nextAttendanceList.filter((a) => a.status === 'playing').length;
        const maybe = nextAttendanceList.filter((a) => a.status === 'maybe').length;
        const notPlaying = nextAttendanceList.filter((a) => a.status === 'not_playing').length;

        queryClient.setQueryData(matchDetailKey, {
          ...previousMatchDetail,
          attendanceCount: {
            playing,
            maybe,
            notPlaying,
          },
        });
      }

      // 6. Optimistically remove user from waitlist if they changed status
      if (currentUserId && previousWaitlist && previousWaitlist.length > 0) {
        const updatedWaitlist = previousWaitlist
          .filter((w) => w.userId !== currentUserId)
          .map((w, index) => ({ ...w, queuePosition: index + 1 }));
        queryClient.setQueryData<MatchWaitlistEntry[]>(waitlistKey, updatedWaitlist);
        queryClient.setQueryData<number | null>(myWaitlistKey, null);
      }

      return {
        previousMyAttendance,
        previousAttendanceList,
        previousMatchDetail,
        previousWaitlist,
        previousMyWaitlist,
      };
    },

    onError: (_err, variables, context) => {
      const matchId = variables.matchId;
      if (context?.previousMyAttendance !== undefined) {
        queryClient.setQueryData(queryKeys.matches.myAttendance(matchId), context.previousMyAttendance);
      }
      if (context?.previousAttendanceList !== undefined) {
        queryClient.setQueryData(queryKeys.matches.attendance(matchId), context.previousAttendanceList);
      }
      if (context?.previousMatchDetail !== undefined) {
        queryClient.setQueryData(queryKeys.matches.detail(matchId), context.previousMatchDetail);
      }
      if (context?.previousWaitlist !== undefined) {
        queryClient.setQueryData(queryKeys.matches.waitlist(matchId), context.previousWaitlist);
      }
      if (context?.previousMyWaitlist !== undefined) {
        queryClient.setQueryData(queryKeys.matches.myWaitlistPosition(matchId), context.previousMyWaitlist);
      }
    },

    onSettled: (_, __, variables) => {
      const matchId = variables.matchId;
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.attendance(matchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.myAttendance(matchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.waitlist(matchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.myWaitlistPosition(matchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.detail(matchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.all });
    },
  });
}

export function useJoinWaitlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => attendanceApi.joinWaitlist(matchId),
    onSuccess: (_, matchId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.waitlist(matchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.myWaitlistPosition(matchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.detail(matchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.attendance(matchId) });
    },
  });
}

export function useLeaveWaitlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => attendanceApi.leaveWaitlist(matchId),
    onSuccess: (_, matchId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.waitlist(matchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.myWaitlistPosition(matchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.detail(matchId) });
    },
  });
}
