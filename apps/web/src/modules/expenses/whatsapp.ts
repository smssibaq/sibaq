import { formatINR, toPaise } from './money';
import type { ExpenseSummary } from './types';
export function expenseWhatsAppText(summary: ExpenseSummary, title: string, startsAt: string): string {
  const money = (amount: number) => formatINR(toPaise(amount));
  const date = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(startsAt));
  const amounts = [...new Set(summary.shares.map(s => toPaise(s.share_amount)))];
  const each = amounts.length === 1 ? formatINR(amounts[0]) : 'See individual shares below';
  return [
    `💰 ${title} – ${date}`,
    `Total: ${money(summary.total_amount)} (ground ${money(summary.base_amount)} + extras ${money(summary.extra_amount)})`,
    `Each: ${each}`,
    ...summary.shares.map(s => s.status === 'paid'
      ? `✅ Paid: ${s.display_name} (${money(s.share_amount)})`
      : s.status === 'partial'
        ? `🟡 Partial: ${s.display_name} (${money(s.paid_amount)} / ${money(s.share_amount)})`
        : `❌ Unpaid: ${s.display_name} ${money(s.share_amount)}`),
    `Collected ${money(summary.collected_amount)} · Pending ${money(summary.outstanding_amount)}`,
  ].join('\n');
}
