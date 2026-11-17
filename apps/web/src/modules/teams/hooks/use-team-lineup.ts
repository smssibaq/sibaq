import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/infrastructure/query-keys';
import { teamApi } from '../api';
import { matchApi } from '@/modules/matches/api';
import { useFormationStore } from '../store/use-formation-store';
import { useToast } from '@/components/ui/toast';
import type { SaveFormationParams, PitchCoordinate } from '../types';

export function useTeamLineup(matchId: string) {
  const queryClient = useQueryClient();

  // 1. Fetch match info
  const matchQuery = useQuery({
    queryKey: queryKeys.matches.detail(matchId),
    queryFn: () => matchApi.getMatch(matchId),
    enabled: Boolean(matchId),
  });

  // 2. Fetch match teams and their players
  const teamsQuery = useQuery({
    queryKey: queryKeys.teams.byMatch(matchId),
    queryFn: () => teamApi.listMatchTeams(matchId),
    enabled: Boolean(matchId),
  });

  // 3. Fetch confirmed players from attendance
  const confirmedPlayersQuery = useQuery({
    queryKey: ['matches', matchId, 'confirmed-playing'],
    queryFn: () => teamApi.listConfirmedMatchPlayers(matchId),
    enabled: Boolean(matchId),
  });

  return {
    match: matchQuery.data ?? null,
    teams: teamsQuery.data ?? [],
    confirmedPlayers: (confirmedPlayersQuery.data ?? []).filter(p => p.status === 'playing'),
    isLoading: matchQuery.isLoading || teamsQuery.isLoading || confirmedPlayersQuery.isLoading,
    isError: matchQuery.isError || teamsQuery.isError || confirmedPlayersQuery.isError,
    error: matchQuery.error || teamsQuery.error || confirmedPlayersQuery.error,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.byMatch(matchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.detail(matchId) });
      queryClient.invalidateQueries({ queryKey: ['matches', matchId, 'confirmed-playing'] });
    },
  };
}

export function useSaveFormationMutation(matchId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const setSavedRevision = useFormationStore((s) => s.setSavedRevision);

  return useMutation({
    mutationFn: (params: SaveFormationParams) => teamApi.saveFormation(params),
    onSuccess: (newRevision) => {
      setSavedRevision(newRevision);
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.byMatch(matchId) });
      toast.success(
        'Formation Saved',
        `Lineup synced at revision ${newRevision}. Live across all match devices.`
      );
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to save formation.';
      const isStale = msg.toLowerCase().includes('revision') || msg.toLowerCase().includes('conflict');

      if (isStale) {
        toast.error(
          'Stale Revision Conflict',
          'Another captain modified this lineup. Please review incoming updates.'
        );
        queryClient.invalidateQueries({ queryKey: queryKeys.teams.byMatch(matchId) });
      } else {
        toast.error('Save Failed', msg);
      }
    },
  });
}

export function useAssignPlayerMutation(matchId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      teamId,
      userId,
      position = 'SUB',
      isSubstitute = true,
      coordinate = null,
    }: {
      teamId: string;
      userId: string;
      position?: string;
      isSubstitute?: boolean;
      coordinate?: PitchCoordinate | null;
    }) =>
      teamApi.assignPlayer(teamId, userId, isSubstitute ? 'SUB' : position, isSubstitute, coordinate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.byMatch(matchId) });
      queryClient.invalidateQueries({ queryKey: ['matches', matchId, 'confirmed-playing'] });
      toast.success('Player Assigned to Bench', 'Player added to substitutes bench.');
    },
    onError: (err: unknown) => {
      toast.error(
        'Assignment Error',
        err instanceof Error ? err.message : 'Could not assign player to team.'
      );
    },
  });
}

export function useRemovePlayerMutation(matchId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => teamApi.removePlayer(matchId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.byMatch(matchId) });
      queryClient.invalidateQueries({ queryKey: ['matches', matchId, 'confirmed-playing'] });
      toast.info('Player Unassigned', 'Moved back to unassigned pool.');
    },
    onError: (err: unknown) => {
      toast.error(
        'Removal Error',
        err instanceof Error ? err.message : 'Could not remove player.'
      );
    },
  });
}

