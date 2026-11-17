import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { normalizeError } from '../../lib/errors';
import type { SampleItem, CreateSampleItemInput, UpdateSampleItemInput } from './types';

const QUERY_KEY = ['sample-items'];

// In-memory mock store for unconfigured local demo mode
let mockItems: SampleItem[] = [
  {
    id: 'demo-1',
    owner_id: '00000000-0000-0000-0000-000000000001',
    title: 'Initialize Team Repository',
    description: 'Clone the starter and verify environment configurations.',
    status: 'active',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'demo-2',
    owner_id: '00000000-0000-0000-0000-000000000001',
    title: 'Review Problem Statement',
    description: 'Map agreed MVP requirements into Feature A, B, and C domains.',
    status: 'draft',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

export function useSampleItems() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<SampleItem[]> => {
      if (!isSupabaseConfigured) {
        return [...mockItems];
      }

      const { data, error } = await supabase
        .from('sample_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw normalizeError(error);
      }

      return (data || []) as SampleItem[];
    },
  });
}

export function useCreateSampleItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSampleItemInput): Promise<SampleItem> => {
      if (!isSupabaseConfigured) {
        const newItem: SampleItem = {
          id: `demo-${Date.now()}`,
          owner_id: '00000000-0000-0000-0000-000000000001',
          title: input.title,
          description: input.description || null,
          status: input.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        mockItems = [newItem, ...mockItems];
        return newItem;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('sample_items')
        .insert({
          title: input.title,
          description: input.description || null,
          status: input.status,
          owner_id: user?.id,
        })
        .select()
        .single();

      if (error) {
        throw normalizeError(error);
      }

      return data as SampleItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateSampleItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateSampleItemInput;
    }): Promise<SampleItem> => {
      if (!isSupabaseConfigured) {
        mockItems = mockItems.map((item) =>
          item.id === id
            ? {
                ...item,
                ...input,
                updated_at: new Date().toISOString(),
              }
            : item
        );
        const updated = mockItems.find((i) => i.id === id);
        if (!updated) throw new Error('Item not found');
        return updated;
      }

      const { data, error } = await supabase
        .from('sample_items')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw normalizeError(error);
      }

      return data as SampleItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteSampleItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!isSupabaseConfigured) {
        mockItems = mockItems.filter((i) => i.id !== id);
        return;
      }

      const { error } = await supabase
        .from('sample_items')
        .delete()
        .eq('id', id);

      if (error) {
        throw normalizeError(error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

