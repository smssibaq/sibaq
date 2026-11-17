import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
export function useLineupDrag(onDrop: (id: string, x: number, y: number) => void) {
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const session = useRef<{ id: string; x: number; y: number; active: boolean; touch: boolean; pointer: number; timer?: ReturnType<typeof setTimeout> } | null>(null);
  const suppressUntil = useRef(0);
  const drop = useRef(onDrop); drop.current = onDrop;
  useEffect(() => {
    function move(event: PointerEvent) {
      const current = session.current;
      if (!current || current.pointer !== event.pointerId) return;
      if (!current.active && current.touch && Math.hypot(event.clientX - current.x, event.clientY - current.y) > 8) { clearTimeout(current.timer); session.current = null; return; }
      if (!current.active && event.pointerType !== 'touch' && Math.hypot(event.clientX - current.x, event.clientY - current.y) > 6) current.active = true;
      if (current.active) { event.preventDefault(); suppressUntil.current = Date.now() + 500; setDrag({ id: current.id, x: event.clientX, y: event.clientY }); }
    }
    function finish(event: PointerEvent) {
      const current = session.current;
      if (!current || current.pointer !== event.pointerId) return;
      if (current.active && current.touch && event.type === 'pointercancel') return;
      clearTimeout(current.timer); session.current = null; setDrag(null);
      if (current.active) { suppressUntil.current = Date.now() + 500; if (event.type !== 'pointercancel') drop.current(current.id, event.clientX, event.clientY); }
    }
    function preventScroll(event: TouchEvent) {
      const current = session.current;
      if (!current?.active || !current.touch || !event.touches[0]) return;
      event.preventDefault();
      const touch = event.touches[0]; suppressUntil.current = Date.now() + 500;
      setDrag({ id: current.id, x: touch.clientX, y: touch.clientY });
    }
    function touchEnd(event: TouchEvent) {
      const current = session.current;
      if (!current?.touch) return;
      clearTimeout(current.timer); session.current = null; setDrag(null);
      if (current.active) {
        suppressUntil.current = Date.now() + 500;
        const touch = event.changedTouches[0];
        if (event.type !== 'touchcancel' && touch) drop.current(current.id, touch.clientX, touch.clientY);
      }
    }
    function cancel() { clearTimeout(session.current?.timer); session.current = null; setDrag(null); }
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', finish); window.addEventListener('pointercancel', finish);
    window.addEventListener('touchend', touchEnd); window.addEventListener('touchcancel', touchEnd); window.addEventListener('blur', cancel); document.addEventListener('touchmove', preventScroll, { passive: false });
    return () => { clearTimeout(session.current?.timer); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', finish); window.removeEventListener('touchend', touchEnd); window.removeEventListener('touchcancel', touchEnd); window.removeEventListener('blur', cancel); document.removeEventListener('touchmove', preventScroll); };
  }, []);
  return {
    drag,
    suppressClick: () => Date.now() < suppressUntil.current || Boolean(session.current?.active),
    start: (event: ReactPointerEvent<HTMLElement>, id: string, enabled: boolean) => {
      if (!enabled || event.button !== 0 || !event.isPrimary) return;
      clearTimeout(session.current?.timer);
      const current = { id, x: event.clientX, y: event.clientY, active: false, touch: event.pointerType === 'touch', pointer: event.pointerId, timer: undefined as ReturnType<typeof setTimeout> | undefined };
      session.current = current;
      if (event.pointerType === 'touch') current.timer = setTimeout(() => { if (session.current !== current) return; current.active = true; suppressUntil.current = Date.now() + 500; setDrag({ id, x: current.x, y: current.y }); }, 200);
    },
  };
}
