import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Button, Card, FormField, Input, Textarea, useToast } from '@/components/ui';
import { PageHeader } from '@/components/common/page-header';
import { normalizeError } from '@/lib/errors';
import { cricketApi, cricketKeys } from '../api';
import { cricketPaths, useCricketNav } from '../utils';

type PlayersPerSide = 5 | 6 | 7 | 8 | 11;

const FORMATS: { value: PlayersPerSide; label: string; hint: string }[] = [
  { value: 5,  label: '5v5',   hint: '10 players' },
  { value: 6,  label: '6v6',   hint: '12 players' },
  { value: 7,  label: '7v7',   hint: '14 players' },
  { value: 8,  label: '8v8',   hint: '16 players' },
  { value: 11, label: '11v11', hint: '22 players' },
];

export function CricketCreatePage() {
  const go = useCricketNav();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [playersPerSide, setPlayersPerSide] = useState<PlayersPerSide>(6);
  const [overs, setOvers] = useState(0);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: cricketApi.createGame,
    onSuccess: (gameId) => {
      queryClient.invalidateQueries({ queryKey: cricketKeys.list });
      toast.success('Game created', 'Share the invitation code to get players in.');
      go(cricketPaths.game(gameId));
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
    if (!venue.trim()) next.venue = 'Where is the ground?';
    if (overs < 0 || !Number.isInteger(overs)) next.overs = 'Overs must be a whole number (0 = unlimited)';
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
      startsAt: startsAt.toISOString(),
      playersPerSide,
      oversPerInnings: overs,
      notes,
    });
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader
        title="New cricket game"
        description="Players join with the invitation code we generate."
      />

      <form onSubmit={submit} noValidate>
        <Card className="p-4 space-y-4">
          <FormField label="Game title" htmlFor="cr-title" error={errors.title} required>
            <Input
              id="cr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sunday morning cricket"
              maxLength={80}
              isInvalid={!!errors.title}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date" htmlFor="cr-date" error={errors.date} required>
              <Input
                id="cr-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                isInvalid={!!errors.date}
              />
            </FormField>
            <FormField label="Time" htmlFor="cr-time" error={errors.time} required>
              <Input
                id="cr-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                isInvalid={!!errors.time}
              />
            </FormField>
          </div>

          <FormField label="Ground / location" htmlFor="cr-venue" error={errors.venue} required>
            <Input
              id="cr-venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Stadium Road Ground, Kozhikode"
              isInvalid={!!errors.venue}
            />
          </FormField>

          <FormField label="Format">
            <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Format">
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
              Needs {playersPerSide * 2} confirmed players to be ready ({playersPerSide} per side).
            </p>
          </FormField>

          <FormField label="Overs per innings" htmlFor="cr-overs" error={errors.overs}>
            <Input
              id="cr-overs"
              type="number"
              min={0}
              step={1}
              value={overs}
              onChange={(e) => setOvers(Math.max(0, Math.floor(Number(e.target.value))))}
              isInvalid={!!errors.overs}
            />
            <p className="text-xs text-muted-foreground mt-1">Set to 0 for unlimited overs.</p>
          </FormField>

          <FormField label="Notes (optional)" htmlFor="cr-notes" error={errors.notes}>
            <Textarea
              id="cr-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Bring whites, pads provided..."
              maxLength={500}
            />
          </FormField>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => go(cricketPaths.hub)}
              disabled={create.isPending}
            >
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
