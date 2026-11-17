import { GameLocationPicker } from '@/components/location/game-location-picker';
import { manualLocation } from '@/components/location/location-service';
import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Button, Card, FormField, Input, Textarea, useToast } from '@/components/ui';
import { PageHeader } from '@/components/common/page-header';
import { normalizeError } from '@/lib/errors';
import type { VolleyballPlayersPerSide } from '@/types/sports/volleyball.db';
import { volleyballApi, volleyballKeys } from '../api';
import { volleyballPaths, useVolleyballNav } from '../utils';

const FORMATS: { value: VolleyballPlayersPerSide; label: string; hint: string }[] = [
  { value: 6, label: '6v6', hint: '12 players' },
  { value: 4, label: '4v4', hint: '8 players' },
];

export function VolleyballCreatePage() {
  const go = useVolleyballNav();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [location,setLocation] = useState(manualLocation());
  const [playersPerSide, setPlayersPerSide] = useState<VolleyballPlayersPerSide>(6);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: volleyballApi.createGame,
    onSuccess: (gameId) => {
      queryClient.invalidateQueries({ queryKey: volleyballKeys.list });
      toast.success('Game created', 'Share the invitation code to get players in.');
      go(volleyballPaths.game(gameId));
    },
    onError: (err) => toast.error('Could not create game', normalizeError(err).message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Give the game a title';
    else if (title.trim().length > 80) next.title = 'Keep the title under 80 characters';
    if (!date) next.date = 'Pick a date';
    if (!time) next.time = 'Pick a time';
    if (!venue.trim()) next.venue = 'Where is the court?';
    let startsAt: Date | null = null;
    if (date && time) {
      startsAt = new Date(`${date}T${time}`);
      if (Number.isNaN(startsAt.getTime())) next.date = 'Invalid date or time';
      else if (startsAt.getTime() <= Date.now()) next.time = 'Pick a time in the future';
    }
    if (notes.length > 500) next.notes = 'Notes must be 500 characters or fewer';
    setErrors(next);
    if (Object.keys(next).length > 0 || !startsAt) return;

    create.mutate({
      title: title.trim(),
      venue: venue.trim(),
      location,
      startsAt: startsAt.toISOString(),
      playersPerSide,
      notes,
    });
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader title="New volleyball game" description="Players join with the invitation code we generate." />

      <form onSubmit={submit} noValidate>
        <Card className="p-4 space-y-4">
          <FormField label="Game title" htmlFor="vb-title" error={errors.title} required>
            <Input id="vb-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sunday evening volleyball" maxLength={80} isInvalid={!!errors.title} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date" htmlFor="vb-date" error={errors.date} required>
              <Input id="vb-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} isInvalid={!!errors.date} />
            </FormField>
            <FormField label="Time" htmlFor="vb-time" error={errors.time} required>
              <Input id="vb-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} isInvalid={!!errors.time} />
            </FormField>
          </div>

          <GameLocationPicker value={location} onChange={value=>{setLocation(value);setVenue(value.name);}} disabled={create.isPending}/>
          {errors.venue&&<p role="alert" className="text-xs text-danger">{errors.venue}</p>}


          <FormField label="Format">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Format">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  role="radio"
                  aria-checked={playersPerSide === f.value}
                  onClick={() => setPlayersPerSide(f.value)}
                  className={clsx(
                    'flex h-14 flex-col items-center justify-center rounded-lg border text-sm font-bold transition-colors',
                    playersPerSide === f.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-surface text-foreground border-border hover:bg-surface-subtle'
                  )}
                >
                  {f.label}
                  <span className="text-[11px] font-medium opacity-80">{f.hint}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Needs {playersPerSide * 2} players in to be ready ({playersPerSide} per team).
            </p>
          </FormField>

          <FormField label="Notes (optional)" htmlFor="vb-notes" error={errors.notes}>
            <Textarea id="vb-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Bring water, shoes optional..." maxLength={500} />
          </FormField>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => go(volleyballPaths.hub)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" isLoading={create.isPending}>
              Create game
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
