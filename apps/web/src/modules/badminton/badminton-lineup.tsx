import { useEffect, useState, useRef, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from '@tanstack/react-query';
import { Shuffle, Save, Pencil, MoreHorizontal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { normalizeError } from '@/lib/errors';
import { badmintonApi, type BadmintonGameDetail, type BadmintonPlayer } from './api';
import { cleanLineup, confirmedPlayers, moveLineupPlayer, dropLineupPlayer, type LineupDraft } from './lineup-assignment';
import { BadmintonPlayerMenu } from './badminton-player-menu';
import { useBadmintonDrag } from './use-badminton-drag';

export function BadmintonLineup({ game, onSaved }: { game: BadmintonGameDetail; onSaved: () => void | Promise<unknown> }) {
  const { toast } = useToast();
  const perSide = game.format === 'singles' ? 1 : 2;
  const confirmed = confirmedPlayers(game.players);
  const saved: LineupDraft = { slots: (['A', 'B'] as const).flatMap(side => {
    const pairs = game.pairs.filter(p => p.side === side);
    const result = Array<string | null>(perSide).fill(null);
    for (const pair of pairs) {
      const index = pair.position ?? result.indexOf(null);
      if (index >= 0 && index < perSide) result[index] = pair.userId;
    }
    return result;
  }), bench: game.bench, positions: Object.fromEntries(game.pairs.filter(p => p.coordinate).map(p => [p.userId, p.coordinate!])) };
  const [draft, setDraft] = useState<LineupDraft | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState({ left: 12, top: 12, right: 12, bottom: 12 });
  const courtRef = useRef<HTMLDivElement>(null);
  const benchRef = useRef<HTMLElement>(null);
  const eligibility = JSON.stringify(game.players.map(p => ({ userId: p.userId, status: p.status })));
  const state = cleanLineup(game.isOrganizer ? draft ?? saved : saved, game.players, perSide);
  const { slots } = state;
  const editing = draft !== null && game.isOrganizer;
  useEffect(() => {
    const players: BadmintonPlayer[] = JSON.parse(eligibility);
    setDraft(current => {
      if (!current) return null;
      const next = cleanLineup(current, players, perSide);
      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });
    setSelected(id => players.some(p => p.userId === id && p.status === 'in') ? id : null);
    setMenuId(id => players.some(p => p.userId === id && p.status !== 'out') ? id : null);
  }, [eligibility, perSide]);
  const mutation = useMutation({
    mutationFn: async () => {
      if (!game.isOrganizer) throw new Error('Only organizers can save a lineup.');
      if (!game.lineupStorageReady) throw new Error('Apply the badminton_lineup_bench SQL migration before saving.');
      await badmintonApi.saveLineup(game.id, slots.slice(0, perSide), slots.slice(perSide), state.bench, Object.keys(state.positions ?? {}).length ? state.positions : undefined);
    },
    onSuccess: async () => { await onSaved(); setDraft(null); setSelected(null); toast.success('Lineup saved'); },
    onError: err => toast.error('Could not save lineup', normalizeError(err).message),
  });
  function showPlayerMenu(id: string, element: HTMLElement) {
    if (!game.isOrganizer || mutation.isPending || dragging.suppressClick()) return;
    const rect = element.getBoundingClientRect();
    setMenuAnchor({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom });
    setSelected(game.players.some(p => p.userId === id && p.status === 'in') ? id : null);
    setMenuId(id);
  }
  function openMenu(event: MouseEvent, id: string) {
    if (!game.isOrganizer) return;
    event.preventDefault();
    showPlayerMenu(id, event.currentTarget as HTMLElement);
  }
  function move(id: string, target: 'A' | 'B' | 'bench' | 'remove') {
    if (!game.isOrganizer || mutation.isPending) return;
    const player = game.players.find(p => p.userId === id);
    if (!player) return;
    const next = target === 'remove' ? moveLineupPlayer(state, player, target, perSide) : dropLineupPlayer(state, player, target, perSide);
    if (!next) { toast.error('Cannot move player', 'The destination is full or the player is not confirmed. Move a player to the bench first.'); return; }
    setDraft(next); setMenuId(null);
  }
  function place(index: number) {
    if (!game.isOrganizer || mutation.isPending) return;
    if (!editing) { setDraft(state); setSelected(slots[index]); return; }
    if (!selected) { setSelected(slots[index]); return; }
    if (!confirmed.some(p => p.userId === selected)) return;
    const player = confirmed.find(p => p.userId === selected);
    if (!player) return;
    const next = dropLineupPlayer(state, player, index < perSide ? 'A' : 'B', perSide, defaultPosition(index));
    if (!next) { toast.error('Team is full'); return; }
    setDraft(next);
    setSelected(null);
  }
  function shuffle() {
    const ids = confirmed.map(p => p.userId);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    setDraft(cleanLineup({ slots: Array.from({ length: perSide * 2 }, (_, i) => ids[i] ?? null), bench: state.bench }, game.players, perSide)); setSelected(null);
  }
  function dropZone(x: number, y: number): 'A' | 'B' | 'bench' | null {
    const bench = benchRef.current?.getBoundingClientRect();
    if (bench && x >= bench.left && x <= bench.right && y >= bench.top && y <= bench.bottom) return 'bench';
    const court = courtRef.current?.getBoundingClientRect();
    if (!court) return null;
    const nx = (x - court.left) / court.width; const ny = (y - court.top) / court.height;
    if (nx < .06 || nx > .94 || ny < .05 || ny > .95 || (ny >= .47 && ny <= .53)) return null;
    return ny < .5 ? 'A' : 'B';
  }
  function defaultPosition(index: number) {
    return { x: perSide === 1 ? .5 : index % perSide === 0 ? .29 : .71, y: index < perSide ? (perSide === 1 ? .28 : index % perSide === 0 ? .24 : .36) : (perSide === 1 ? .72 : index % perSide === 0 ? .64 : .76) };
  }
  const dragging = useBadmintonDrag((id, x, y) => {
    if (!game.isOrganizer || mutation.isPending) return;
    const player = confirmed.find(p => p.userId === id);
    const zone = dropZone(x, y);
    if (!player || !zone) { toast.error('Invalid drop', 'Drop inside a court half or the bench.'); return; }
    const rect = courtRef.current?.getBoundingClientRect();
    const position = zone !== 'bench' && rect ? { x: (x - rect.left) / rect.width, y: (y - rect.top) / rect.height } : undefined;
    const next = dropLineupPlayer(state, player, zone, perSide, position);
    if (!next) { toast.error('Team is full', 'Move a player to the bench first.'); return; }
    const placed = next.positions?.[id];
    if (placed && next.slots.some((other, index) => {
      if (!other || other === id) return false;
      const point = next.positions?.[other] ?? defaultPosition(index);
      return Math.abs(point.x - placed.x) < .2 && Math.abs(point.y - placed.y) < .13;
    })) { toast.error('Position occupied', 'Choose a free position inside that court half.'); return; }
    setDraft(cleanLineup(next, game.players, perSide)); setMenuId(null); setSelected(id);
  });
  const dragTarget = dragging.drag ? dropZone(dragging.drag.x, dragging.drag.y) : null;
  const draggedPlayer = game.players.find(p => p.userId === dragging.drag?.id);
  const validDragTarget = Boolean(dragTarget && draggedPlayer && dropLineupPlayer(state, draggedPlayer, dragTarget, perSide));
  const assignment = (id: string) => slots.includes(id) ? (slots.indexOf(id) < perSide ? 'A' : 'B') : state.bench.includes(id) ? 'bench' : null;
  function playerCard(p: BadmintonPlayer) {
    const current = assignment(p.userId);
    return <div key={p.userId} onContextMenu={e => openMenu(e, p.userId)} className={`flex min-w-0 items-center gap-2 rounded-xl border p-2 ${selected === p.userId ? 'border-primary bg-primary/10' : 'border-border'}`}>
      <button type="button" onDragStart={event => event.preventDefault()} onPointerDown={event => dragging.start(event, p.userId, game.isOrganizer && !mutation.isPending && p.status === "in")} style={{ touchAction: "pan-y" }} disabled={!game.isOrganizer || mutation.isPending} aria-pressed={selected === p.userId} onClick={event => showPlayerMenu(p.userId, event.currentTarget)} aria-haspopup="menu" aria-expanded={menuId === p.userId} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"><Avatar userId={p.userId} size="sm" src={p.avatarUrl} fallback={p.displayName} alt={p.displayName} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{p.displayName}</span><span className="text-xs text-muted-foreground">{current === 'bench' ? 'Bench' : current ? `Team ${current}` : 'Unassigned'}</span></span></button>
      <Badge variant={p.status === 'maybe' ? 'warning' : 'outline'}>{p.status === 'maybe' ? 'Maybe' : 'Confirmed'}</Badge>
      {game.isOrganizer && <Button type="button" size="icon" variant="ghost" aria-label={`Actions for ${p.displayName}`} disabled={mutation.isPending} onClick={event => showPlayerMenu(p.userId, event.currentTarget)}><MoreHorizontal className="h-4 w-4" /></Button>}
    </div>;
  }
  const menuPlayer = game.players.find(p => p.userId === menuId && p.status !== 'out');
  return <Card className="overflow-hidden rounded-2xl">
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
      <div><p className="text-xs font-bold uppercase tracking-widest text-primary">The court</p><h2 className="text-lg font-bold">{editing ? 'Build your lineup' : 'Match lineup'}</h2>{editing && <p role="status" className="text-xs text-primary">Unsaved changes</p>}</div>
      {game.isOrganizer && !editing && <Button variant="outline" onClick={() => setDraft(state)}><Pencil className="mr-2 h-4 w-4" />Edit lineup</Button>}
      {editing && <Button variant="outline" disabled={mutation.isPending || confirmed.length < perSide * 2} onClick={shuffle}><Shuffle className="mr-2 h-4 w-4" />Shuffle</Button>}
    </div>
    <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-4">
      <div className="flex justify-between text-xs font-bold uppercase tracking-wider"><span className="text-primary">Side A · {slots.slice(0, perSide).filter(Boolean).length}/{perSide}</span><span>Side B · {slots.slice(perSide).filter(Boolean).length}/{perSide}</span></div>
      <div ref={courtRef} className="relative mx-auto aspect-[1/1.4] w-full max-w-lg overflow-hidden rounded-xl border border-[#294237] bg-gradient-to-br from-[#1d503c] to-[#0b2c22] shadow-inner">
        {dragging.drag && <div aria-hidden="true" className={'pointer-events-none absolute inset-x-[6%] z-10 border-2 transition-colors ' + (validDragTarget ? 'border-primary bg-primary/10' : 'border-red-400/60 bg-red-400/5')} style={{ top: dragTarget === 'B' ? '50%' : '5%', height: '45%', opacity: dragTarget === 'A' || dragTarget === 'B' ? 1 : .2 }} />}
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
          const point = id && state.positions?.[id] ? state.positions[id] : defaultPosition(index);
          const left = point.x * 100; const top = point.y * 100;
          return <div key={index} onContextMenu={e => { if (id) openMenu(e, id); }} className="absolute w-[36%] -translate-x-1/2 -translate-y-1/2" style={{ left: `${left}%`, top: `${top}%` }}>
            <button type="button" onDragStart={event => event.preventDefault()} onPointerDown={event => { if (id) dragging.start(event, id, game.isOrganizer && !mutation.isPending); }} style={{ touchAction: "pan-y", opacity: dragging.drag?.id === id ? .3 : 1 }} disabled={!game.isOrganizer || mutation.isPending} onClick={event => { if (id) showPlayerMenu(id, event.currentTarget); else place(index); }} aria-haspopup={id ? "menu" : undefined} aria-expanded={Boolean(id && menuId === id)} aria-label={`${sideA ? 'Side A' : 'Side B'} position ${index % perSide + 1}: ${player?.displayName ?? 'Empty'}`} aria-pressed={Boolean(id && selected === id)} className={`flex min-h-16 w-full cursor-grab select-none flex-col items-center gap-1 rounded-xl p-1 transition ${id && selected === id ? 'bg-primary/20 ring-2 ring-primary' : editing ? 'hover:bg-white/10' : ''}`}>
              {player ? <Avatar userId={player.userId} src={player.avatarUrl} alt={player.displayName} fallback={player.displayName} className={`h-12 w-12 border-2 shadow-lg ${sideA ? 'border-primary' : 'border-white'}`} /> : <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-white/60 text-xl text-white">+</span>}
              <span className="max-w-full truncate rounded bg-[#0b1f19]/90 px-2 py-1 text-xs font-semibold text-white">{player?.displayName ?? (editing ? 'Assign player' : 'Awaiting player')}</span>
            </button>
            {player && game.isOrganizer && <Button type="button" size="icon" variant="outline" className="absolute -right-1 -top-2 h-9 w-9 bg-surface" aria-label={`Actions for ${player.displayName}`} disabled={mutation.isPending} onClick={event => showPlayerMenu(player.userId, event.currentTarget)}><MoreHorizontal className="h-4 w-4" /></Button>}
          </div>;
        })}
      </div>
      {editing && <>
        <p className="text-sm text-muted-foreground" role="status">{selected ? 'Choose a team below, or click a player for more actions.' : 'Click a player to move them to a team or the bench.'}</p>
        <div className="grid grid-cols-2 gap-2">{(['A', 'B'] as const).map(side => <Button key={side} type="button" variant={selected && assignment(selected) === side ? 'default' : 'outline'} aria-pressed={Boolean(selected && assignment(selected) === side)} disabled={!selected || mutation.isPending} onClick={() => { if (selected) move(selected, side); }}>Team {side}</Button>)}</div>
      </>}
      <p className="text-xs text-muted-foreground">Drag players in between court and bench. On touch screens, hold briefly to drag; tap for actions.</p>
      <section ref={benchRef} className={"space-y-2 rounded-xl border p-3 transition-colors " + (dragging.drag ? dragTarget === "bench" ? "border-primary bg-primary/10" : "border-dashed border-primary/40" : "border-border")}><h3 className="text-sm font-bold">Substitutes &amp; Bench</h3>
        <p className="text-xs font-semibold text-muted-foreground">Confirmed substitutes</p>
        {confirmed.filter(p => state.bench.includes(p.userId)).map(playerCard)}
        {!confirmed.some(p => state.bench.includes(p.userId)) && <p className="text-xs text-muted-foreground">No confirmed substitutes.</p>}
        <p className="pt-2 text-xs font-semibold text-muted-foreground">Maybe players</p>
        {game.players.filter(p => p.status === 'maybe').map(playerCard)}
        {!game.players.some(p => p.status === 'maybe') && <p className="text-xs text-muted-foreground">No Maybe responses.</p>}
      </section>
      <section className="space-y-2"><h3 className="text-sm font-bold">Unassigned players in</h3>
        {confirmed.filter(p => !slots.includes(p.userId) && !state.bench.includes(p.userId)).map(playerCard)}
        {!confirmed.some(p => !slots.includes(p.userId) && !state.bench.includes(p.userId)) && <p className="text-xs text-muted-foreground">No unassigned players in.</p>}
      </section>
      {editing && <section className="space-y-2"><h3 className="text-sm font-bold">Active players</h3>{confirmed.filter(p => slots.includes(p.userId)).map(playerCard)}</section>}
      {game.isOrganizer && !game.lineupStorageReady && <p role="alert" className="text-sm text-warning">Bench storage is not installed. Run the badminton_lineup_bench SQL migration before saving.</p>}
      {editing && <div className="flex flex-wrap gap-2 border-t border-border pt-4"><Button className="flex-1" disabled={!game.lineupStorageReady} isLoading={mutation.isPending} onClick={() => mutation.mutate()}><Save className="mr-2 h-4 w-4" />Save lineup</Button><Button variant="outline" disabled={mutation.isPending} onClick={() => { setDraft(null); setSelected(null); }}>Cancel</Button></div>}
    </div>
    {dragging.drag && draggedPlayer && createPortal(<div aria-hidden="true" className="pointer-events-none fixed z-[70] flex w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-xl border border-primary bg-[#142D25]/95 p-2 shadow-2xl" style={{ left: dragging.drag.x, top: dragging.drag.y }}><Avatar userId={draggedPlayer.userId} src={draggedPlayer.avatarUrl} fallback={draggedPlayer.displayName} /><span className="max-w-full truncate text-xs font-bold">{draggedPlayer.displayName}</span><span className={validDragTarget ? 'text-xs text-primary' : 'text-xs text-red-300'}>{validDragTarget ? dragTarget === 'bench' ? 'Bench' : 'Team ' + dragTarget : 'Invalid drop'}</span></div>, document.body)}
    {game.isOrganizer && menuPlayer && <BadmintonPlayerMenu avatarUrl={menuPlayer.avatarUrl} anchor={menuAnchor} name={menuPlayer.displayName} current={assignment(menuPlayer.userId)} maybe={menuPlayer.status === 'maybe'} disabled={mutation.isPending} canMove={target => Boolean(target === 'remove' ? moveLineupPlayer(state, menuPlayer, target, perSide) : dropLineupPlayer(state, menuPlayer, target, perSide))} onMove={target => move(menuPlayer.userId, target)} onClose={() => setMenuId(null)} />}
  </Card>;
}
