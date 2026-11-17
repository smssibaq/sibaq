import { useMatchRealtime } from '@/infrastructure/supabase/realtime';
import { useFormationStore } from '../store/use-formation-store';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/infrastructure/query-keys';

interface UseLineupRealtimeOptions {
  matchId: string;
  enabled?: boolean;
}

export function useLineupRealtime({ matchId, enabled = true }: UseLineupRealtimeOptions) {
  const queryClient = useQueryClient();

  useMatchRealtime({
    matchId,
    enabled: enabled && Boolean(matchId),
    onUpdate: ({ table }) => {
      if (table === 'match_attendance') {
        // Attendance pool updates live across all screens immediately
        queryClient.invalidateQueries({ queryKey: ['matches', matchId, 'confirmed-playing'] });
        queryClient.invalidateQueries({ queryKey: queryKeys.matches.attendance(matchId) });
      }

      if (table === 'teams' || table === 'team_players') {
        const { activeDragUserId, isDirty } = useFormationStore.getState();

        // If local user is not actively dragging and hasn't made unsaved tactical changes,
        // refresh server truth immediately
        if (!activeDragUserId && !isDirty) {
          queryClient.invalidateQueries({ queryKey: queryKeys.teams.byMatch(matchId) });
        }
      }
    },
  });
}

