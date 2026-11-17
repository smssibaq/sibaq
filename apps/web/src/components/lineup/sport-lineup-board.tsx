import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlayerActionMenu } from '@/components/ui/player-action-menu';
import { useToast } from '@/components/ui/toast';
import { normalizeError } from '@/lib/errors';
import { useLineupDrag } from './use-lineup-drag';
export interface BoardPlayer { id: string; name: string; avatar?: string | null; status: 'playing' | 'maybe' | 'not_playing'; side: 'A' | 'B' | null }
export interface LayoutRow { user_id: string; assignment: 'A' | 'B' | 'bench' | null; x: number | null; y: number | null }
export function SportLineupBoard({ sport, players, capacity, canEdit, layout, storageReady, onSave }: {
  sport: 'cricket' | 'volleyball'; players: BoardPlayer[]; capacity: number; canEdit: boolean; layout: LayoutRow[]; storageReady: boolean;
  onSave: (rows: LayoutRow[]) => Promise<unknown>;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<LayoutRow[] | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState({ left: 12, top: 12 });
  const court = useRef<HTMLDivElement>(null), bench = useRef<HTMLElement>(null);
  const eligible = players.filter(p => p.status !== 'not_playing');
  const eligibility = JSON.stringify(eligible.map(p => [p.id, p.status]));
  useEffect(() => {
    const statuses = new Map<string, string>(JSON.parse(eligibility));
    setDraft(current => current ? current.filter(r => statuses.has(r.user_id)).map(r => statuses.get(r.user_id) === 'maybe' ? { ...r, assignment: 'bench', x: null, y: null } : r) : null);
  }, [eligibility]);
  const rows = eligible.map(p => {
    const saved = (draft ?? layout).find(r => r.user_id === p.id);
    return p.status === 'maybe' ? { user_id: p.id, assignment: 'bench' as const, x: null, y: null } : saved ?? { user_id: p.id, assignment: p.side, x: null, y: null };
  });
  const mutation = useMutation({ mutationFn: () => onSave(rows), onSuccess: () => { setDraft(null); toast.success('Lineup saved'); }, onError: e => toast.error('Save failed', normalizeError(e).message) });
  function canMove(id: string, target: 'A' | 'B' | 'bench' | 'remove') {
    const p = eligible.find(p => p.id === id); if (!p) return false;
    if (p.status === 'maybe') return target === 'bench';
    return target !== 'A' && target !== 'B' || rows.filter(r => r.user_id !== id && r.assignment === target).length < capacity;
  }
  function move(id: string, target: 'A' | 'B' | 'bench' | 'remove', point?: { x: number; y: number }) {
    if (!canEdit || mutation.isPending) return;
    if (!canMove(id, target)) { toast.error('Invalid move', "Only players in can join a team, within its capacity."); return; }
    setDraft(rows.map(r => r.user_id === id ? { user_id: id, assignment: target === 'remove' ? null : target, x: point?.x ?? null, y: point?.y ?? null } : r)); setMenuId(null);
  }
  function zone(x: number, y: number) {
    const b = bench.current?.getBoundingClientRect(); if (b && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) return 'bench';
    const rect = court.current?.getBoundingClientRect(); if (!rect) return null;
    const nx = (x - rect.left) / rect.width, ny = (y - rect.top) / rect.height;
    if (nx < .08 || nx > .92 || ny < .06 || ny > .94 || Math.abs(ny - .5) < .025) return null;
    if (sport === 'cricket' && Math.pow((nx - .5) / .43, 2) + Math.pow((ny - .5) / .45, 2) > 1) return null;
    return ny < .5 ? 'A' : 'B';
  }
  const drag = useLineupDrag((id, x, y) => {
    const target = zone(x, y); if (!target) { toast.error('Invalid drop', 'Drop inside a team region or the bench.'); return; }
    const rect = court.current!.getBoundingClientRect();
    move(id, target, target === 'bench' ? undefined : { x: Math.max(.16, Math.min(.84, (x - rect.left) / rect.width)), y: Math.max(target === 'A' ? .12 : .6, Math.min(target === 'A' ? .4 : .88, (y - rect.top) / rect.height)) });
  });
  const dragZone = drag.drag ? zone(drag.drag.x, drag.drag.y) : null;
  function open(id: string, element: HTMLElement) { if (!canEdit || mutation.isPending || drag.suppressClick()) return; const rect = element.getBoundingClientRect(); setAnchor({ left: rect.left, top: rect.bottom + 6 }); setMenuId(id); }
  function marker(p: BoardPlayer, onCourt = false) {
    const row = rows.find(r => r.user_id === p.id)!;
    return <button type="button" key={p.id} aria-label={`Actions for ${p.name}`} aria-haspopup="menu" disabled={!canEdit || mutation.isPending} onDragStart={e => e.preventDefault()} onPointerDown={e => drag.start(e, p.id, canEdit && !mutation.isPending && p.status === 'playing')} onClick={e => open(p.id, e.currentTarget)} style={{ touchAction: 'pan-y', opacity: drag.drag?.id === p.id ? .3 : 1 }} className={`flex min-w-0 select-none items-center rounded-xl text-left ${onCourt ? 'w-full flex-col gap-0 p-0 text-center' : 'min-h-11 gap-2 border border-border bg-surface-subtle p-2'}`}><Avatar userId={p.id} alt={p.name} src={p.avatar} fallback={p.name} size="sm" className={onCourt ? 'h-10 w-10 border-2 border-primary shadow-lg sm:h-12 sm:w-12' : ''} /><span className={`min-w-0 truncate font-semibold ${onCourt ? 'max-w-full rounded bg-[#0B1F19]/90 px-1 text-[9px] leading-3 text-white' : 'flex-1 text-xs'}`}>{p.name}</span>{!onCourt && <Badge variant={p.status === 'maybe' ? 'warning' : 'outline'}>{p.status === 'maybe' ? 'Maybe' : row.assignment ?? 'Unassigned'}</Badge>}</button>;
  }
  function shuffle() { const ids = eligible.filter(p => p.status === 'playing').map(p => p.id); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; } setDraft(rows.map(r => { const index = ids.indexOf(r.user_id); return { user_id: r.user_id, assignment: index < 0 || index >= capacity * 2 ? 'bench' : index < capacity ? 'A' : 'B', x: null, y: null }; })); }
  const selected = eligible.find(p => p.id === menuId); const selectedRow = rows.find(r => r.user_id === menuId);
  return <Card className="space-y-4 rounded-2xl p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-base font-bold capitalize">{sport} lineup</h2>{draft && <p role="status" className="text-xs text-primary">Unsaved changes</p>}</div>{canEdit && <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={shuffle}>Shuffle teams</Button>}</div>
    <div className="flex justify-between text-xs font-bold text-primary">{(['A','B'] as const).map(side => <span key={side}>Team {side} · {rows.filter(r => r.assignment === side).length}/{capacity}</span>)}</div>
    <div ref={court} className={'relative mx-auto aspect-[3/4] w-full max-w-lg overflow-hidden border-2 border-[#294237] bg-gradient-to-br from-[#1c503a] to-[#0B1F19] ' + (sport === 'cricket' ? 'rounded-[48%]' : 'rounded-xl')}>
      <svg viewBox="0 0 100 130" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">{sport === 'cricket' ? <><ellipse cx="50" cy="65" rx="44" ry="59" fill="none" stroke="#dcebdc" strokeWidth=".6" /><rect x="44" y="48" width="12" height="34" rx="2" fill="#b5aa72" /><path d="M46 51H54 M46 79H54 M48 49V54 M50 49V54 M52 49V54 M48 76V81 M50 76V81 M52 76V81" stroke="white" strokeWidth=".7" /></> : <><rect x="7" y="7" width="86" height="116" fill="none" stroke="#e8f0e8" strokeWidth=".7" /><path d="M7 43H93 M7 87H93" stroke="#e8f0e8" strokeWidth=".5" /><path d="M3 65H97" stroke="white" strokeWidth="1" strokeDasharray="1 1" /></>}</svg>
      {drag.drag && <div className={'pointer-events-none absolute inset-x-[8%] z-10 h-[42%] rounded-xl border-2 ' + (dragZone && canMove(drag.drag.id, dragZone) ? 'border-primary bg-primary/10' : 'border-red-400/50')} style={{ top: dragZone === 'B' ? '53%' : '5%' }} />}
      {(['A','B'] as const).flatMap(side => { const team = rows.filter(r => r.assignment === side); const columns = capacity <= 6 ? 2 : 3; return team.map((r, index) => { const p = eligible.find(p => p.id === r.user_id)!; const countRows = Math.ceil(capacity / columns); const x = r.x ?? .25 + (index % columns) * .5 / Math.max(1, columns - 1); const y = r.y ?? (side === 'A' ? .12 : .6) + Math.floor(index / columns) * .28 / Math.max(1, countRows - 1); return <div key={r.user_id} className="absolute z-20 w-[25%] -translate-x-1/2 -translate-y-1/2" style={{ left: `${x * 100}%`, top: `${y * 100}%` }}>{marker(p, true)}</div>; }); })}
    </div>
    <p className="text-xs text-muted-foreground">Drag to a team or bench. On touch screens, hold briefly to drag; tap for actions.</p>
    <section ref={bench} className={'space-y-2 rounded-xl border p-3 ' + (dragZone === 'bench' ? 'border-primary bg-primary/10' : 'border-border')}><h3 className="text-sm font-bold">Substitutes &amp; provisional bench</h3><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{eligible.filter(p => rows.find(r => r.user_id === p.id)?.assignment === 'bench').map(p => marker(p))}</div><h3 className="pt-2 text-sm font-bold">Unassigned players in</h3><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{eligible.filter(p => rows.find(r => r.user_id === p.id)?.assignment === null).map(p => marker(p))}</div></section>
    {canEdit && !storageReady && <p role="alert" className="text-xs text-warning">Apply the {sport} lineup SQL migration to enable saving.</p>}
    {canEdit && draft && <div className="flex gap-2"><Button className="flex-1" disabled={!storageReady} isLoading={mutation.isPending} onClick={() => mutation.mutate()}>Save lineup</Button><Button variant="outline" disabled={mutation.isPending} onClick={() => setDraft(null)}>Cancel</Button></div>}
    {selected && <PlayerActionMenu anchor={anchor} name={selected.name} current={selectedRow?.assignment ?? null} maybe={selected.status === 'maybe'} disabled={mutation.isPending} canMove={target => canMove(selected.id,target)} onMove={target => move(selected.id,target)} onClose={() => setMenuId(null)} />}
    {drag.drag && createPortal(<div aria-hidden="true" className="pointer-events-none fixed z-[70] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-primary bg-surface p-3 text-xs shadow-xl" style={{ left: drag.drag.x, top: drag.drag.y }}><Avatar userId={drag.drag.id} src={eligible.find(p => p.id === drag.drag?.id)?.avatar} alt={eligible.find(p => p.id === drag.drag?.id)?.name} fallback={eligible.find(p => p.id === drag.drag?.id)?.name} className="mx-auto mb-1" />{eligible.find(p => p.id === drag.drag?.id)?.name}</div>,document.body)}
  </Card>;
}
