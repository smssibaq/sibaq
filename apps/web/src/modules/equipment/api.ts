import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import { useToast } from '@/components/ui/toast';
import type { EquipmentSummary } from './types';

export const equipmentKey = (gameId: string) => ['equipment', gameId] as const;

export function equipmentErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = String(error.message);
    if (msg.includes('ALREADY_CLAIMED: Someone else is already bringing this')) {
      return 'ALREADY_CLAIMED: Someone else is already bringing this';
    }
    if (msg.includes('Confirm you are playing before claiming kit')) {
      return 'Confirm you are playing before claiming kit';
    }
    if (msg.includes('Nobody is bringing this yet')) {
      return 'Nobody is bringing this yet';
    }
    if (msg.includes('Item name must be 1-40 characters')) {
      return 'Item name must be 1-40 characters';
    }
    if (msg.includes('Forbidden')) {
      return 'Forbidden';
    }
    return msg;
  }
  return 'Unable to update kit checklist.';
}

export function useGameEquipment(gameId: string) {
  return useQuery({
    queryKey: equipmentKey(gameId),
    enabled: Boolean(gameId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_game_equipment', { p_game: gameId });
      if (error) throw error;
      return data as unknown as EquipmentSummary;
    },
  });
}

export function useClaimEquipment(gameId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      itemId,
      claim = true,
      note = null,
    }: {
      itemId: string;
      claim?: boolean;
      note?: string | null;
    }) => {
      const { data, error } = await supabase.rpc('claim_game_equipment', {
        p_item: itemId,
        p_claim: claim,
        p_note: note,
      });
      if (error) throw error;
      return data as unknown as EquipmentSummary;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(equipmentKey(gameId), data);
    },
    onError: (error) => {
      toast.error(equipmentErrorMessage(error));
    },
  });
}

export function useAddEquipment(gameId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      item,
      isRequired = false,
    }: {
      item: string;
      isRequired?: boolean;
    }) => {
      const { data, error } = await supabase.rpc('add_game_equipment', {
        p_game: gameId,
        p_item: item,
        p_required: isRequired,
      });
      if (error) throw error;
      return data as unknown as EquipmentSummary;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(equipmentKey(gameId), data);
      toast.success('Item added');
    },
    onError: (error) => {
      toast.error(equipmentErrorMessage(error));
    },
  });
}

export function useRemoveEquipment(gameId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      const { data, error } = await supabase.rpc('remove_game_equipment', {
        p_item: itemId,
      });
      if (error) throw error;
      return data as unknown as EquipmentSummary;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(equipmentKey(gameId), data);
      toast.success('Item removed');
    },
    onError: (error) => {
      toast.error(equipmentErrorMessage(error));
    },
  });
}

export function useSetEquipmentBrought(gameId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      itemId,
      isBrought,
    }: {
      itemId: string;
      isBrought: boolean;
    }) => {
      const { data, error } = await supabase.rpc('set_equipment_brought', {
        p_item: itemId,
        p_brought: isBrought,
      });
      if (error) throw error;
      return data as unknown as EquipmentSummary;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(equipmentKey(gameId), data);
    },
    onError: (error) => {
      toast.error(equipmentErrorMessage(error));
    },
  });
}

export function useEquipmentRealtime(gameId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!gameId) return;
    const channel = supabase
      .channel(`equipment:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_equipment',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: equipmentKey(gameId) });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gameId, queryClient]);
}
