import type { ItemStatus } from '../../types/database.types';

export interface SampleItem {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  status: ItemStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateSampleItemInput {
  title: string;
  description?: string;
  status: ItemStatus;
}

export interface UpdateSampleItemInput {
  title?: string;
  description?: string;
  status?: ItemStatus;
}

