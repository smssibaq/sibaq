export interface ExpenseShare {
  player_id: string;
  display_name: string;
  share_amount: number;
  paid_amount: number;
  status: 'paid' | 'partial' | 'unpaid';
  is_manual: boolean;
}
export interface ExpenseSummary {
  expense_id: string;
  game_id: string;
  sport: string;
  description: string | null;
  base_amount: number;
  extra_amount: number;
  total_amount: number;
  allocated_amount: number;
  collected_amount: number;
  outstanding_amount: number;
  unpaid_count: number;
  is_organizer: boolean;
  shares: ExpenseShare[];
}
