import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, MapPin } from 'lucide-react';
import { Button, Card, FormField, Input, useToast } from '@/components/ui';
import { PageHeader } from '@/components/common/page-header';
import { formatInTimezone } from '@/lib/dates';
import { normalizeError } from '@/lib/errors';
import { volleyballApi, volleyballKeys } from '../api';
import { formatFormat, volleyballPaths, useVolleyballNav } from '../utils';

const CODE_RE = /^[A-Z0-9]{8}$/;

function readCodeFromUrl(): string {
  if (typeof window === 'undefined') return '';
  return (new URLSearchParams(window.location.search).get('code') ?? '').trim().toUpperCase();
}

export function VolleyballJoinPage() {
  const go = useVolleyballNav();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [code, setCode] = useState(readCodeFromUrl);
  const [submitted, setSubmitted] = useState(() => CODE_RE.test(readCodeFromUrl()) ? readCodeFromUrl() : '');
  const [inputError, setInputError] = useState('');

  const preview = useQuery({
    queryKey: volleyballKeys.preview(submitted),
    queryFn: () => volleyballApi.previewByCode(submitted),
    enabled: Boolean(submitted),
    retry: false,
  });

  const join = useMutation({
    mutationFn: volleyballApi.joinByCode,
    onSuccess: (gameId) => {
      queryClient.invalidateQueries({ queryKey: volleyballKeys.list });
      toast.success('You joined the game', "Set your Availability so everyone knows if you are in.");
      go(volleyballPaths.game(gameId));
    },
    onError: (err) => toast.error('Could not join', normalizeError(err).message),
  });

  // Keep the field in sync if the user navigates between invite links.
  useEffect(() => {
    const fromUrl = readCodeFromUrl();
    if (fromUrl && CODE_RE.test(fromUrl)) {
      setCode(fromUrl);
      setSubmitted(fromUrl);
    }
  }, []);

  const lookup = (e: FormEvent) => {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!CODE_RE.test(normalized)) {
      setInputError('Invitation codes are 8 letters or digits.');
      return;
    }
    setInputError('');
    setSubmitted(normalized);
  };

  const game = preview.data;
  const closed = game && (game.status === 'completed' || game.status === 'cancelled');

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader title="Join a game" description="Enter the invitation code a friend shared with you." />

      <form onSubmit={lookup} noValidate>
        <Card className="p-4 space-y-3">
          <FormField label="Invitation code" htmlFor="vb-code" error={inputError}>
            <Input
              id="vb-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="A1B2C3D4"
              maxLength={8}
              autoCapitalize="characters"
              autoComplete="off"
              className="font-mono tracking-widest uppercase"
              isInvalid={!!inputError}
            />
          </FormField>
          <Button type="submit" variant="secondary" className="w-full" isLoading={preview.isFetching}>
            Find game
          </Button>
        </Card>
      </form>

      {submitted && !preview.isFetching && preview.error && (
        <Card className="p-4 text-sm text-danger" role="alert">
          {normalizeError(preview.error).message}
        </Card>
      )}

      {submitted && !preview.isFetching && !preview.error && preview.isSuccess && !game && (
        <Card className="p-4 text-sm text-danger" role="alert">
          That invitation code is not valid. Double-check it with the organizer.
        </Card>
      )}

      {game && (
        <Card className="p-4 space-y-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">{game.title}</h2>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              {formatInTimezone(game.starts_at)}
            </p>
            {game.venue && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {game.venue}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {formatFormat(game.players_per_side)} · {game.playing_count} of {game.capacity} players confirmed
            </p>
          </div>

          {game.already_joined ? (
            <Button className="w-full" onClick={() => go(volleyballPaths.game(game.game_id))}>
              Open game
            </Button>
          ) : closed ? (
            <p className="text-sm text-muted-foreground">This game is no longer open.</p>
          ) : (
            <Button className="w-full" onClick={() => join.mutate(submitted)} isLoading={join.isPending}>
              Join game
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
