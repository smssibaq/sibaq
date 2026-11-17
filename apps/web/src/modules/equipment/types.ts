export interface EquipmentItem {
  id: string;
  item: string;
  is_required: boolean;
  claimed_by: string | null;
  claimed_by_name: string | null;
  claimed_by_avatar: string | null;
  is_mine: boolean;
  is_brought: boolean;
  note: string | null;
  can_remove: boolean;
}

export interface EquipmentSummary {
  game_id: string;
  can_edit: boolean;
  can_claim: boolean;
  total_count: number;
  claimed_count: number;
  unclaimed_required: number;
  items: EquipmentItem[];
}
