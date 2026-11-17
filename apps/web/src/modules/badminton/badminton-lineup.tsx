import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Shuffle, Save, Pencil, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/toast';
import { normalizeError } from '@/lib/errors';
import { badmintonApi, type BadmintonGameDetail } from './api';

type Slots = (string | null)[];
export function BadmintonLineup({ game, onSaved }: { game: BadmintonGameDetail; onSaved: () => void }) {
  const { toast } = useToast();
  const perSide = game.format === 'singles' ? 1 : 2;
  const confirmed = game.players.filter(p => p.status === 'in');
  const saved = (['A', 'B'] as const).flatMap(side => {
    const ids = game.pairs.filter(p => p.side === side && confirmed.some(c => c.userId === p.userId)).map(p => p.userId).sort();
    return Array.from({ length: perSide }, (_, i) => ids[i] ?? null);
  });
  const [draft, setDraft] = useState<Slots | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const slots = game.isOrganizer ? draft ?? saved : saved;
  const editing = draft !== null && game.isOrganizer;
  const valid = slots.every(id => id && confirmed.some(p => p.userId === id)) && new Set(slots).size === perSide * 2;
  const mutation = useMutation({
    mutationFn: async () => {
      if (!game.isOrganizer || !valid) throw new Error('Fill every position with a confirmed player.');
      await badmintonApi.setPairs(game.id, slots.slice(0, perSide) as string[], slots.slice(perSide) as string[]);
    },
    onSuccess: async () => { await onSaved(); setDraft(null); setSelected(null); toast.success('Lineup saved'); },
    onError: err => toast.error('Could not save lineup', normalizeError(err).message),
  });
  function place(index: number) {
    if (!editing || mutation.isPending) return;
    const occupant = slots[index];
    if (!selected) { setSelected(occupant); return; }
    const next = [...slots];
    const old = next.indexOf(selected);
    if (old >= 0) next[old] = occupant;
    next[index] = selected;
    setDraft(next); setSelected(null);
  }
  function shuffle() {
    const ids = confirmed.map(p => p.userId);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    setDraft(Array.from({ length: perSide * 2 }, (_, i) => ids[i] ?? null)); setSelected(null);
  }
  return <Card className="overflow-hidden rounded-2xl">
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
      <div><p className="text-xs font-bold uppercase tracking-widest text-primary">The court</p><h2 className="text-lg font-bold">{editing ? 'Build your lineup' : 'Match lineup'}</h2></div>
      {game.isOrganizer && !editing && <Button variant="outline" onClick={() => setDraft([...saved])}><Pencil className="mr-2 h-4 w-4" />Edit lineup</Button>}
      {editing && <Button variant="outline" disabled={mutation.isPending || confirmed.length < perSide * 2} onClick={shuffle}><Shuffle className="mr-2 h-4 w-4" />Shuffle</Button>}
    </div>
    <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-4">
      <div className="flex justify-between text-xs font-bold uppercase tracking-wider"><span className="text-primary">Side A · {slots.slice(0, perSide).filter(Boolean).length}/{perSide}</span><span>Side B · {slots.slice(perSide).filter(Boolean).length}/{perSide}</span></div>
      <div className="relative mx-auto aspect-[1/1.4] w-full max-w-lg overflow-hidden rounded-xl border border-[#294237] bg-gradient-to-br from-[#1d503c] to-[#0b2c22] shadow-inner">
        <svg viewBox="0 0 100 140" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <g fill="none" stroke="#dcebdc" strokeOpacity=".65" strokeWidth=".55"><rect x="6" y="6" width="88" height="128" /><path d="M13 6V134 M87 6V134 M6 15H94 M6 125H94 M6 46H94 M6 94H94 M50 6V46 M50 94V134" /></g>
          {game.format === 'singles' && <rect x="13" y="6" width="74" height="128" fill="none" stroke="#b7f34b" strokeWidth=".8" />}
          <path d="M3 70H97" stroke="#f5f7f4" strokeWidth="1" strokeDasharray="1 1" /><path d="M3 71H97" stroke="#000" strokeOpacity=".3" strokeWidth="1" />
        </svg>
        <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[10px] font-bold tracking-[.3em] text-white/50">SIDE A</span>
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-[.3em] text-white/50">SIDE B</span>
        {slots.map((id, index) => {
          const player = game.players.find(p => p.userId === id);
          const sideA = index < perSide;
          const left = perSide === 1 ? 50 : index % perSide === 0 ? 29 : 71;
          const top = sideA ? (perSide === 1 ? 28 : index % perSide === 0 ? 24 : 36) : (perSide === 1 ? 72 : index % perSide === 0 ? 64 : 76);
          return <button type="button" key={index} disabled={!editing || mutation.isPending} onClick={() => place(index)} aria-label={`${sideA ? 'Side A' : 'Side B'} position ${index % perSide + 1}: ${player?.displayName ?? 'Empty'}`} aria-pressed={Boolean(id && selected === id)} className={`absolute flex min-h-16 w-[36%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-xl p-1 transition ${id && selected === id ? 'bg-primary/20 ring-2 ring-primary' : editing ? 'hover:bg-white/10' : ''}`} style={{ left: `${left}%`, top: `${top}%` }}>
            {player ? <Avatar src={player.avatarUrl} alt={player.displayName} fallback={player.displayName} className={`border-2 shadow-lg ${sideA ? 'border-primary' : 'border-white'}`} /> : <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-white/60 text-xl text-white">+</span>}
            <span className="max-w-full truncate rounded bg-[#0b1f19]/90 px-2 py-1 text-xs font-semibold text-white">{player?.displayName ?? (editing ? 'Assign player' : 'Awaiting player')}</span>
          </button>;
        })}
      </div>
      {editing && <>
        <p className="text-sm text-muted-foreground" role="status">{selected ? 'Tap a court position to move or swap this player.' : 'Select a player, then tap a court position. Select two occupied positions to swap.'}</p>
        <div className="flex flex-wrap gap-2">{confirmed.map(p => <button type="button" key={p.userId} disabled={mutation.isPending} aria-pressed={selected === p.userId} onClick={() => setSelected(selected === p.userId ? null : p.userId)} className={`flex min-h-11 max-w-full items-center gap-2 rounded-xl border px-3 text-sm ${selected === p.userId ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}><Avatar size="sm" src={p.avatarUrl} fallback={p.displayName} /><span className="truncate">{p.displayName}</span><span className="text-xs text-muted-foreground">{slots.includes(p.userId) ? `Side ${slots.indexOf(p.userId) < perSide ? 'A' : 'B'}` : 'Unassigned'}</span></button>)}</div>
        {!confirmed.length && <p className="text-sm text-muted-foreground">Players will appear here when they confirm attendance.</p>}
        {selected && slots.includes(selected) && <Button variant="outline" disabled={mutation.isPending} onClick={() => { setDraft(slots.map(id => id === selected ? null : id)); setSelected(null); }}><X className="mr-2 h-4 w-4" />Remove assignment</Button>}
        <div className="flex flex-wrap gap-2 border-t border-border pt-4"><Button className="flex-1" disabled={!valid} isLoading={mutation.isPending} onClick={() => mutation.mutate()}><Save className="mr-2 h-4 w-4" />Save lineup</Button><Button variant="outline" disabled={mutation.isPending} onClick={() => { setDraft(null); setSelected(null); }}>Cancel</Button></div>
        {!valid && <p className="text-xs text-muted-foreground">Assign {perSide} confirmed {perSide === 1 ? 'player' : 'players'} to each side to save.</p>}
      </>}
      {!editing && !game.pairs.length && <p className="text-center text-sm text-muted-foreground">The organizer will set the lineup once players confirm.</p>}
    </div>
  </Card>;
}
