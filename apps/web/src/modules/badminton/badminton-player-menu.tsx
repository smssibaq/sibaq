import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRightLeft, Coffee, UserMinus } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Target = 'A' | 'B' | 'bench' | 'remove';
export function BadmintonPlayerMenu({ anchor, name, avatarUrl, current, maybe, disabled, canMove, onMove, onClose, hasTeamB = true }: {
  hasTeamB?: boolean;
  anchor: { left: number; top: number; right?: number; bottom?: number };
  avatarUrl?: string | null;
  name: string; current: Target | null; maybe: boolean; disabled: boolean;
  canMove: (target: Target) => boolean; onMove: (target: Target) => void; onClose: () => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(anchor);
  useLayoutEffect(() => {
    const rect = menu.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 12;
    const right = anchor.right ?? anchor.left;
    const bottom = anchor.bottom ?? anchor.top;
    let left = right + 8; let top = anchor.top;
    if (left + rect.width > window.innerWidth - margin) {
      if (anchor.left - rect.width - 8 >= margin) left = anchor.left - rect.width - 8;
      else { left = anchor.left; top = bottom + 8; if (top + rect.height > window.innerHeight - margin) top = anchor.top - rect.height - 8; }
    }
    setPosition({ left: Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin)), top: Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin)) });
  }, [anchor]);
  const options: readonly (readonly [Target, string])[] = maybe ? [['bench', 'On provisional bench']] : [
    ...(current !== 'A' ? [['A', 'Move to Team A']] as const : []),
    ...(hasTeamB && current !== 'B' ? [['B', 'Move to Team B']] as const : []),
    ...(current !== 'bench' ? [['bench', 'Move to Bench']] as const : []),
    ...(current ? [['remove', 'Remove from Lineup']] as const : []),
  ];

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    (menu.current?.querySelector<HTMLButtonElement>('[role=menuitemradio]:not(:disabled)') ?? menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)'))?.focus();
    return () => { previous?.focus(); };
  }, []);
  return createPortal(<div className="fixed inset-0 z-[80]" onContextMenu={e => e.preventDefault()}>
    <button type="button" tabIndex={-1} aria-label="Close player menu" className="absolute inset-0" onClick={onClose} />
    <div ref={menu} role="menu" aria-label={`Manage ${name}`} style={position} className="fixed max-h-[calc(100dvh-24px)] w-60 max-w-[calc(100vw-24px)] overflow-y-auto overscroll-contain rounded-2xl border border-primary/25 bg-[#142D25] p-2 text-[#F5F7F4] shadow-2xl" onKeyDown={e => {
      if (e.key === 'Tab') onClose();
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        const items = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        const index = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (e.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
        items[next]?.focus();
      }
    }}>
      <div className="mb-2 flex items-center gap-2 border-b border-border p-2 pb-3"><Avatar src={avatarUrl} fallback={name} alt={name} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{name}</p><Badge variant="outline" className="mt-1 text-[10px] text-primary">{maybe ? 'Provisional bench' : current === 'bench' ? 'Bench' : current ? 'Team ' + current : 'Unassigned'}</Badge></div><Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Close player menu" onClick={onClose}><X className="h-4 w-4" /></Button></div>
      {maybe && <p className="mb-2 text-xs text-muted-foreground">Maybe players stay on the bench until confirmed.</p>}
      {options.map(([target, label]) => <button type="button" role="menuitemradio" aria-checked={current === target} key={target} disabled={disabled || current === target || !canMove(target)} onClick={() => onMove(target)} className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm disabled:opacity-40 ${current === target ? 'bg-primary/10 text-primary' : 'hover:bg-surface-subtle'}`}><span className="flex items-center gap-2">{target === "bench" ? <Coffee className="h-4 w-4 text-primary" /> : target === "remove" ? <UserMinus className="h-4 w-4" /> : <ArrowRightLeft className="h-4 w-4 text-primary" />}{label}</span>{current === target && <span aria-hidden="true">✓</span>}</button>)}
    </div>
  </div>, document.body);
}
