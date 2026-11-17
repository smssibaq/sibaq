import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/modules/auth/auth-provider';
import {
  expenseErrorMessage, isExpenseForbidden, useExpenseGameContext,
  useExpenseMutation, useExpenseRealtime, useExpenseSummary, type ExpenseAction,
} from './api';
import { formatINR, splitEqually, toPaise, toRupees } from './money';
import { expenseWhatsAppText } from './whatsapp';
import type { ExpenseShare, ExpenseSummary } from './types';

const money = (rupees: number) => formatINR(toPaise(rupees));
const MAX_PAISE = 999999999999;

type Editor = { kind: 'amounts' } | { kind: 'share' | 'payment'; share: ExpenseShare };

function AmountForm({ initial, count, busy, onSave, onCancel }: {
  initial?: ExpenseSummary; count: number; busy: boolean;
  onSave: (base: number, extra: number, description: string) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [base, setBase] = useState(initial ? String(initial.base_amount) : '');
  const [extra, setExtra] = useState(initial ? String(initial.extra_amount) : '0');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [error, setError] = useState('');
  let preview: number[] = [];
  try { preview = splitEqually(toPaise(base) + toPaise(extra || '0'), count); } catch { /* Incomplete input. */ }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const basePaise = toPaise(base);
      const extraPaise = toPaise(extra || '0');
      const total = basePaise + extraPaise;
      if (basePaise <= 0) throw new Error('Ground or court cost must be greater than zero.');
      if (total > MAX_PAISE) throw new Error('Total must be at most ₹9,99,99,99,999.99.');
      if (!initial && count === 0) throw new Error('No confirmed players to split with.');
      const manual = initial?.shares.filter(s => s.is_manual).reduce((sum, s) => sum + toPaise(s.share_amount), 0) ?? 0;
      if (total < manual) throw new Error('Total cannot be less than the fixed manual shares. Reset or edit those shares first.');
      await onSave(toRupees(basePaise), toRupees(extraPaise), description.trim());
    } catch (err) { setError(expenseErrorMessage(err)); }
  }
  return <form onSubmit={submit} className="space-y-4">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm font-medium">Ground / court cost (₹)
        <Input inputMode="decimal" value={base} onChange={e => setBase(e.target.value)} required disabled={busy} placeholder="1000.00" />
      </label>
      <label className="space-y-1 text-sm font-medium">Extras (₹, optional)
        <Input inputMode="decimal" value={extra} onChange={e => setExtra(e.target.value)} disabled={busy} placeholder="0.00" />
      </label>
    </div>
    <label className="block space-y-1 text-sm font-medium">Description (optional)
      <Input value={description} onChange={e => setDescription(e.target.value)} maxLength={200} disabled={busy} placeholder="Court booking, shuttles…" />
    </label>
    {initial ? <p className="text-sm text-muted-foreground">Saving rebalances equal shares and keeps manual shares and payments.</p>
      : <p className="text-sm text-muted-foreground" aria-live="polite">{count === 0 ? 'Confirm players before adding an expense.'
        : preview.length ? `${formatINR(preview[preview.length - 1])}${preview[0] !== preview[preview.length - 1] ? `–${formatINR(preview[0])}` : ''} each for ${count} players${preview[0] !== preview[preview.length - 1] ? ' (leftover paise distributed equally)' : ''}`
          : `Split across ${count} confirmed players.`}</p>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <Button type="submit" isLoading={busy} disabled={!initial && !count}>{initial ? 'Save amounts' : 'Create expense'}</Button>
      {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>}
    </div>
  </form>;
}

function PlayerAmountForm({ editor, summary, busy, onSave }: {
  editor: Extract<Editor, { share: ExpenseShare }>; summary: ExpenseSummary; busy: boolean;
  onSave: (amount: number) => Promise<boolean>;
}) {
  const [value, setValue] = useState(String(editor.kind === 'share' ? editor.share.share_amount : editor.share.paid_amount));
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      setError('');
      const paise = toPaise(value);
      if (paise > MAX_PAISE) throw new Error('Amount is too large.');
      if (editor.kind === 'share') {
        const otherManual = summary.shares.filter(s => s.is_manual && s.player_id !== editor.share.player_id)
          .reduce((sum, s) => sum + toPaise(s.share_amount), 0);
        if (paise + otherManual > toPaise(summary.total_amount)) throw new Error('Manual shares cannot exceed the total expense.');
      }
      await onSave(toRupees(paise));
    } catch (err) { setError(expenseErrorMessage(err)); }
  }
  return <form onSubmit={submit} className="space-y-4">
    <p className="text-sm text-muted-foreground">{editor.kind === 'share' ? 'Fix this share; the remaining equal shares will rebalance.' : 'Enter the total paid so far, including previous payments.'}</p>
    <label className="block space-y-1 text-sm font-medium">{editor.kind === 'share' ? 'Share' : 'Total paid'} (₹)
      <Input autoFocus inputMode="decimal" required value={value} onChange={e => setValue(e.target.value)} disabled={busy} />
    </label>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <Button type="submit" isLoading={busy}>Save {editor.kind === 'share' ? 'share' : 'payment'}</Button>
  </form>;
}

function PaymentBadge({ status }: { status: ExpenseShare['status'] }) {
  return <Badge variant={status === 'paid' ? 'success' : status === 'partial' ? 'warning' : 'danger'}>
    {status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Unpaid'}
  </Badge>;
}

/** Drop this public component into any sport page with its shared games.id. */
export function ExpensePanel({ gameId }: { gameId: string }) {
  const { user } = useAuth();
  return <ExpensePanelContent key={`${gameId}:${user?.id ?? 'guest'}`} gameId={gameId} />;
}

function ExpensePanelContent({ gameId }: { gameId: string }) {
  const contextQuery = useExpenseGameContext(gameId);
  const context = contextQuery.data;
  const allowed = Boolean(context && (context.is_organizer || context.is_participant));
  const summaryQuery = useExpenseSummary(gameId, allowed);
  const summary = summaryQuery.data;
  const [forbidden, setForbidden] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const mutation = useExpenseMutation(gameId, () => { setForbidden(true); setEditor(null); });
  const { toast } = useToast();
  const lastError = useRef<unknown>(null);
  const error = contextQuery.error ?? summaryQuery.error;
  useExpenseRealtime(gameId, allowed ? summary?.expense_id : undefined);
  useEffect(() => {
    if (error && lastError.current !== error) {
      lastError.current = error;
      toast.error('Unable to load money splitting', expenseErrorMessage(error));
    }
  }, [error, toast]);
  const organizer = !forbidden && !isExpenseForbidden(error) && Boolean(context?.is_organizer)
    && (!summary || summary.is_organizer);
  async function run(action: ExpenseAction): Promise<boolean> {
    try { await mutation.mutateAsync(action); return true; } catch { return false; }
  }
  async function copy() {
    if (!summary || !context) return;
    try {
      await navigator.clipboard.writeText(expenseWhatsAppText(summary, context.title, context.starts_at));
      toast.success('Copied for WhatsApp');
    } catch (err) { toast.error('Could not copy summary', expenseErrorMessage(err)); }
  }
  if (isExpenseForbidden(error) || (contextQuery.isSuccess && !allowed)) return null;
  if (contextQuery.isLoading || (allowed && summaryQuery.isLoading)) {
    return <Card className="p-4 sm:p-6"><p role="status">Loading money splitting…</p></Card>;
  }
  if (error) return <Card className="space-y-3 p-4 sm:p-6">
    <h2 className="text-lg font-bold">Money</h2>
    <p role="alert" className="text-sm text-danger">{expenseErrorMessage(error)}</p>
    <Button variant="outline" onClick={() => { void contextQuery.refetch(); void summaryQuery.refetch(); }}>Retry</Button>
  </Card>;
  if (!context || !allowed) return null;
  if (!summary) return <Card className="space-y-4 p-4 sm:p-6">
    <h2 className="text-lg font-bold">Money</h2>
    {organizer ? <AmountForm count={context.confirmed_count} busy={mutation.isPending}
      onSave={(base, extra, description) => run({ kind: 'create', base, extra, description })} />
      : <p className="text-sm text-muted-foreground">The organizer hasn’t added an expense yet.</p>}
  </Card>;
  const progress = Math.min(100, Math.max(0, summary.total_amount > 0 ? summary.collected_amount / summary.total_amount * 100 : 0));
  return <Card className="space-y-5 p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold">Money</h2><p className="text-sm text-muted-foreground">{summary.description || 'Game costs and payment tracking'}</p></div>
      {organizer && <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={mutation.isPending} onClick={() => setEditor({ kind: 'amounts' })}>Edit amounts</Button>
        <Button variant="outline" size="sm" disabled={mutation.isPending} onClick={() => { void run({ kind: 'resplit', expenseId: summary.expense_id }); }}>Re-sync players</Button>
        <Button variant="outline" size="sm" onClick={() => { void copy(); }}>Copy for WhatsApp</Button>
      </div>}
    </div>
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {([['Total', money(summary.total_amount)], ['Collected', money(summary.collected_amount)],
        ['Outstanding', money(summary.outstanding_amount)], ['Unpaid players', String(summary.unpaid_count)]]).map(([label, value]) =>
        <div key={label} className="rounded-lg border border-border bg-surface-subtle p-3 min-w-0">
          <dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words text-lg font-bold">{value}</dd>
        </div>)}
    </dl>
    <div className="space-y-1">
      <div role="progressbar" aria-label="Expense collected" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}
        className="h-2 overflow-hidden rounded-full bg-surface-subtle"><div className="h-full bg-success transition-all" style={{ width: `${progress}%` }} /></div>
      <p className="text-xs text-muted-foreground">{Math.round(progress)}% collected · Ground {money(summary.base_amount)} + extras {money(summary.extra_amount)}</p>
    </div>
    {organizer && toPaise(summary.allocated_amount) !== toPaise(summary.total_amount) &&
      <p role="status" className="text-sm text-warning">Shares total {money(summary.allocated_amount)} against {money(summary.total_amount)} in costs. Adjust manual shares or re-sync players to balance.</p>}
    <div className="space-y-3">
      {summary.shares.length === 0 && <p className="text-sm text-muted-foreground">No shares allocated. {organizer ? 'Re-sync after confirming players.' : 'Ask the organizer to re-sync players.'}</p>}
      {summary.shares.map(share => <div key={share.player_id} className="space-y-3 rounded-lg border border-border p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0"><p className="break-words font-semibold">{organizer ? share.display_name : 'Your share'}</p>
            <p className="text-sm">{money(share.share_amount)}{share.is_manual && <span className="ml-2 text-xs text-muted-foreground">Manual</span>}</p>
          </div>
          <PaymentBadge status={share.status} />
        </div>
        <p className="text-sm text-muted-foreground">Paid {money(share.paid_amount)} · Pending {money(Math.max(0, toRupees(toPaise(share.share_amount) - Math.min(toPaise(share.share_amount), toPaise(share.paid_amount)))))}</p>
        {organizer && <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => setEditor({ kind: 'share', share })}>Edit share</Button>
          {share.is_manual && <Button size="sm" variant="ghost" disabled={mutation.isPending}
            onClick={() => { void run({ kind: 'share', expenseId: summary.expense_id, playerId: share.player_id, amount: null }); }}>Reset to equal</Button>}
          <Button size="sm" variant="outline" disabled={mutation.isPending || share.status === 'paid'}
            onClick={() => { void run({ kind: 'payment', expenseId: summary.expense_id, playerId: share.player_id, amount: share.share_amount }); }}>Mark paid</Button>
          <Button size="sm" variant="outline" disabled={mutation.isPending || share.paid_amount === 0}
            onClick={() => { void run({ kind: 'payment', expenseId: summary.expense_id, playerId: share.player_id, amount: 0 }); }}>Mark unpaid</Button>
          <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => setEditor({ kind: 'payment', share })}>Partial / enter paid</Button>
        </div>}
      </div>)}
    </div>
    <Dialog isOpen={Boolean(editor) && organizer} onClose={() => { if (!mutation.isPending) setEditor(null); }}
      title={editor?.kind === 'amounts' ? 'Edit game costs' : `${editor?.kind === 'share' ? 'Edit share' : 'Record payment'}: ${editor && 'share' in editor ? editor.share.display_name : ''}`}>
      {editor?.kind === 'amounts' ? <AmountForm key="amounts" initial={summary} count={context.confirmed_count} busy={mutation.isPending}
        onSave={async (base, extra, description) => {
          const saved = await run({ kind: 'update', expenseId: summary.expense_id, base, extra, description });
          if (saved) setEditor(null); return saved;
        }} />
        : editor && <PlayerAmountForm key={`${editor.kind}:${editor.share.player_id}`} editor={editor} summary={summary} busy={mutation.isPending}
          onSave={async amount => {
            const saved = await run({ kind: editor.kind, expenseId: summary.expense_id, playerId: editor.share.player_id, amount });
            if (saved) setEditor(null); return saved;
          }} />}
    </Dialog>
  </Card>;
}
