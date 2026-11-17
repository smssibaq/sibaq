import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { normalizeError } from '@/lib/errors';
import { badmintonApi, type BadmintonGameDetail } from './api';

export function BadmintonEditGame({ game, onSaved }: { game: BadmintonGameDetail; onSaved: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(game.title);
  const [venue, setVenue] = useState(game.venue ?? '');
  const localTime = () => { const date = new Date(game.startsAt); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  const [startsAt, setStartsAt] = useState(localTime);
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: () => badmintonApi.updateGame(game.id, title, venue, startsAt),
    onSuccess: async () => { await onSaved(); setOpen(false); toast.success('Game updated'); },
    onError: err => toast.error('Could not update game', normalizeError(err).message),
  });
  if (!game.isOrganizer) return null;
  return <><Button variant="outline" onClick={() => { setTitle(game.title); setVenue(game.venue ?? ''); setStartsAt(localTime()); setOpen(true); }}><Pencil className="mr-2 h-4 w-4" />Edit</Button><Dialog isOpen={open} onClose={() => { if (!mutation.isPending) setOpen(false); }} title="Edit badminton game"><form className="space-y-4" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}><label className="block space-y-2 text-sm"><span>Match title</span><Input required maxLength={120} value={title} disabled={mutation.isPending} onChange={e => setTitle(e.target.value)} /></label><label className="block space-y-2 text-sm"><span>Venue</span><Input maxLength={200} value={venue} disabled={mutation.isPending} onChange={e => setVenue(e.target.value)} /></label><label className="block space-y-2 text-sm"><span>Date and time</span><Input type="datetime-local" required value={startsAt} disabled={mutation.isPending} onChange={e => setStartsAt(e.target.value)} /></label><Button type="submit" className="w-full" isLoading={mutation.isPending} disabled={!title.trim() || !startsAt}>Save changes</Button></form></Dialog></>;
}
