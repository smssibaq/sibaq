import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import { useToast } from '@/components/ui/toast';
import type { ExpenseSummary } from './types';

export const expenseKey = (gameId: string) => ['expense', gameId] as const;
export function expenseErrorMessage(error: unknown): string {
  return typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message) : 'Unable to load or update expenses.';
}
export function isExpenseForbidden(error: unknown): boolean {
  return /forbidden|unauthenticated/i.test(expenseErrorMessage(error));
}
export function useExpenseGameContext(gameId: string) {
  return useQuery({
    queryKey: ['expense-game-context', gameId], enabled: Boolean(gameId), retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_game_context', { p_game: gameId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}
export function useExpenseSummary(gameId: string, enabled = true) {
  return useQuery({
    queryKey: expenseKey(gameId), enabled: Boolean(gameId) && enabled, retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_game_expense_summary', { p_game: gameId });
      if (error) throw error;
      return data as unknown as ExpenseSummary | null;
    },
  });
}
export type ExpenseAction =
  | { kind: 'create'; base: number; extra: number; description: string }
  | { kind: 'update'; expenseId: string; base: number; extra: number; description: string }
  | { kind: 'resplit'; expenseId: string }
  | { kind: 'share'; expenseId: string; playerId: string; amount: number | null }
  | { kind: 'payment'; expenseId: string; playerId: string; amount: number };

export function useExpenseMutation(gameId: string, onForbidden: () => void) {
  const client = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (action: ExpenseAction) => {
      let result;
      switch (action.kind) {
        case 'create':
          result = await supabase.rpc('create_game_expense', {
            p_game: gameId, p_base_amount: action.base, p_extra_amount: action.extra,
            p_description: action.description,
          }); break;
        case 'update':
          result = await supabase.rpc('update_game_expense', {
            p_expense: action.expenseId, p_base_amount: action.base,
            p_extra_amount: action.extra, p_description: action.description,
          }); break;
        case 'resplit':
          result = await supabase.rpc('resplit_game_expense', { p_expense: action.expenseId }); break;
        case 'share':
          result = await supabase.rpc('set_expense_share', {
            p_expense: action.expenseId, p_player: action.playerId, p_share_amount: action.amount,
          }); break;
        case 'payment':
          result = await supabase.rpc('record_expense_payment', {
            p_expense: action.expenseId, p_player: action.playerId, p_paid_amount: action.amount,
          });
      }
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: expenseKey(gameId) });
      await client.invalidateQueries({ queryKey: ['expense-game-context', gameId] });
      toast.success('Money updated');
    },
    onError: (error) => {
      toast.error('Expense update failed', expenseErrorMessage(error));
      if (isExpenseForbidden(error)) {
        onForbidden();
        void client.invalidateQueries({ queryKey: ['expense-game-context', gameId] });
        void client.invalidateQueries({ queryKey: expenseKey(gameId) });
      }
    },
  });
}
export function useExpenseRealtime(gameId: string, expenseId: string | undefined) {
  const client = useQueryClient();
  useEffect(() => {
    if (!expenseId) return;
    const channel = supabase.channel(`expense:${gameId}:${expenseId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'game_expense_shares', filter: `expense_id=eq.${expenseId}`,
      }, () => { void client.invalidateQueries({ queryKey: expenseKey(gameId) }); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [client, gameId, expenseId]);
}
