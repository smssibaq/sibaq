import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Target = 'A' | 'B' | 'bench' | 'remove';
export function PlayerActionMenu({ anchor, name, current, maybe, disabled, canMove, onMove, onClose, hasTeamB = true }: {
  hasTeamB?: boolean;
  anchor: { left: number; top: number };
  name: string; current: Target | null; maybe: boolean; disabled: boolean;
  canMove: (target: Target) => boolean; onMove: (target: Target) => void; onClose: () => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(anchor);
  useLayoutEffect(() => {
    const rect = menu.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      left: Math.max(12, Math.min(anchor.left, window.innerWidth - rect.width - 12)),
      top: Math.max(12, Math.min(anchor.top, window.innerHeight - rect.height - 12)),
    });
  }, [anchor]);
  const options: readonly (readonly [Target, string])[] = [
    ['A', 'Move to Team A'], ...(hasTeamB ? [['B', 'Move to Team B']] as const : []),
    ['bench', 'Move to Bench'], ['remove', 'Remove from Lineup'],
  ];
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    return () => { previous?.focus(); };
  }, []);
  return createPortal(<div className="fixed inset-0 z-50" onContextMenu={e => e.preventDefault()}>
    <button type="button" tabIndex={-1} aria-label="Close player menu" className="absolute inset-0" onClick={onClose} />
    <div ref={menu} role="menu" aria-label={`Manage ${name}`} style={position} className="fixed w-64 max-w-[calc(100vw-24px)] rounded-xl border border-border bg-surface p-2 shadow-xl" onKeyDown={e => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        const items = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        const index = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (e.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
        items[next]?.focus();
      }
    }}>
      <div className="mb-2 flex items-center gap-2"><p className="min-w-0 flex-1 truncate text-sm font-bold">{name}</p><Button size="icon" variant="ghost" aria-label="Close player menu" onClick={onClose}><X className="h-4 w-4" /></Button></div>
      {maybe && <p className="mb-2 text-xs text-muted-foreground">Maybe players stay on the bench until confirmed.</p>}
      {options.map(([target, label]) => <button type="button" role="menuitemradio" aria-checked={current === target} key={target} disabled={disabled || current === target || !canMove(target)} onClick={() => onMove(target)} className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm disabled:opacity-40 ${current === target ? 'bg-primary/10 text-primary' : 'hover:bg-surface-subtle'}`}><span>{label}</span>{current === target && <span aria-hidden="true">✓</span>}</button>)}
    </div>
  </div>, document.body);
}
