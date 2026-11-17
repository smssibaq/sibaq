import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, HelpCircle, MapPin, Trophy, X } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { PageHeader } from '@/components/common/page-header';
import { LoadingState } from '@/components/common/loading-state';
import { ErrorState } from '@/components/common/error-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/modules/auth/auth-provider';
import { normalizeError } from '@/lib/errors';
import { formatDateTime } from '@/lib/dates';
import type { BadmintonRsvpStatus, BadmintonSide } from '@/types/sports/badminton.db';
import { RatingsPanel } from '@/modules/ratings';
import { badmintonApi, badmintonKeys, type BadmintonGameDetail } from './api';

const RSVP_OPTIONS: { value: BadmintonRsvpStatus; label: string; icon: typeof Check }[] = [
  { value: 'in', label: "I'm in", icon: Check },
  { value: 'maybe', label: 'Maybe', icon: HelpCircle },
  { value: 'out', label: 'Out', icon: X },
];

function useBadmintonRealtime(gameId: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`realtime:badminton:${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'badminton_rsvps', filter: `game_id=eq.${gameId}` },
        () => queryClient.invalidateQueries({ queryKey: badmintonKeys.detail(gameId) })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'badminton_pairs', filter: `game_id=eq.${gameId}` },
        () => queryClient.invalidateQueries({ queryKey: badmintonKeys.detail(gameId) })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, queryClient]);
}

export function BadmintonGamePage({ gameId }: { gameId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  useBadmintonRealtime(gameId);

  const { data: game, isLoading, error } = useQuery({
    queryKey: badmintonKeys.detail(gameId),
    queryFn: () => badmintonApi.getGame(gameId, user?.id ?? null),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: badmintonKeys.detail(gameId) });
    queryClient.invalidateQueries({ queryKey: badmintonKeys.list });
  };

  const rsvpMutation = useMutation({
    mutationFn: (status: BadmintonRsvpStatus) => badmintonApi.setRsvp(gameId, status),
    onSuccess: invalidate,
    onError: (err) => {
      const msg = normalizeError(err).message;
      toast.error('RSVP failed', /GAME_FULL/.test(String((err as Error)?.message)) ? 'This game is full.' : msg);
    },
  });

  if (isLoading) return <LoadingState message="Loading game..." />;
  if (error || !game) {
    return <ErrorState title="Game not available" message={error ? normalizeError(error).message : 'Game not found.'} />;
  }

  const confirmed = game.players.filter((p) => p.status === 'in');
  const maybe = game.players.filter((p) => p.status === 'maybe');
  const full = confirmed.length >= game.capacity;
  const rsvpClosed = game.status === 'cancelled' || game.status === 'completed';

  return (
    <div className="space-y-5">
      <PageHeader
        title={game.title}
        badge={game.format}
        description={[game.skillLevel && `Level: ${game.skillLevel}`].filter(Boolean).join(' · ') || undefined}
      />

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> {formatDateTime(game.startsAt)}
            </p>
            {(game.venue || game.court) && (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {[game.venue, game.court].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-surface-subtle px-4 py-3">
            <span className="text-sm font-medium">Confirmed</span>
            <span className={`text-2xl font-black ${full ? 'text-primary' : 'text-foreground'}`}>
              {confirmed.length} / {game.capacity}
            </span>
          </div>

          {!rsvpClosed && (
            <div className="grid grid-cols-3 gap-2">
              {RSVP_OPTIONS.map(({ value, label, icon: Icon }) => {
                const active = game.myStatus === value;
                const disabled = value === 'in' && full && game.myStatus !== 'in';
                return (
                  <Button
                    key={value}
                    variant={active ? 'default' : 'outline'}
                    disabled={disabled || rsvpMutation.isPending}
                    onClick={() => rsvpMutation.mutate(value)}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {value === 'in' && disabled ? 'Full' : label}
                  </Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Players</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {confirmed.length === 0 && <p className="text-sm text-muted-foreground">No one has confirmed yet.</p>}
          <ul className="space-y-1.5">
            {confirmed.map((p) => (
              <li key={p.userId} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary" /> {p.displayName}
              </li>
            ))}
          </ul>
          {maybe.length > 0 && (
            <p className="text-xs text-muted-foreground">Maybe: {maybe.map((p) => p.displayName).join(', ')}</p>
          )}
        </CardContent>
      </Card>

      <PairsCard game={game} onSaved={invalidate} />
      <ResultCard game={game} onSaved={invalidate} />

      <RatingsPanel gameId={game.id} />
    </div>
  );
}

function PairsCard({ game, onSaved }: { game: BadmintonGameDetail; onSaved: () => void }) {
  const { toast } = useToast();
  const perSide = game.format === 'singles' ? 1 : 2;
  const confirmed = game.players.filter((p) => p.status === 'in');
  const nameOf = (id: string) => game.players.find((p) => p.userId === id)?.displayName ?? 'Player';

  const [sides, setSides] = useState<Record<string, BadmintonSide | null>>({});
  useEffect(() => {
    const next: Record<string, BadmintonSide | null> = {};
    for (const p of game.pairs) next[p.userId] = p.side;
    setSides(next);
  }, [game.pairs]);

  const sideA = Object.entries(sides).filter(([, s]) => s === 'A').map(([id]) => id);
  const sideB = Object.entries(sides).filter(([, s]) => s === 'B').map(([id]) => id);

  const saveMutation = useMutation({
    mutationFn: () => badmintonApi.setPairs(game.id, sideA, sideB),
    onSuccess: () => {
      toast.success('Pairs saved');
      onSaved();
    },
    onError: (err) => toast.error('Could not save pairs', normalizeError(err).message),
  });

  const shuffle = () => {
    const ids = confirmed.map((p) => p.userId).sort(() => Math.random() - 0.5);
    const next: Record<string, BadmintonSide | null> = {};
    ids.forEach((id, i) => {
      next[id] = i < perSide ? 'A' : i < perSide * 2 ? 'B' : null;
    });
    setSides(next);
  };

  const savedA = game.pairs.filter((p) => p.side === 'A').map((p) => nameOf(p.userId));
  const savedB = game.pairs.filter((p) => p.side === 'B').map((p) => nameOf(p.userId));

  if (!game.isOrganizer) {
    if (game.pairs.length === 0) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pairs</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <SideBox label="Side A" names={savedA} winner={game.winnerSide === 'A'} />
          <SideBox label="Side B" names={savedB} winner={game.winnerSide === 'B'} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Organize pairs</CardTitle>
        <Button size="sm" variant="outline" onClick={shuffle} disabled={confirmed.length < 2}>
          Shuffle
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {confirmed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Pairs can be set once players confirm.</p>
        ) : (
          <ul className="space-y-2">
            {confirmed.map((p) => (
              <li key={p.userId} className="flex items-center justify-between gap-2">
                <span className="text-sm truncate">{p.displayName}</span>
                <div className="flex gap-1">
                  {(['A', 'B'] as const).map((side) => {
                    const active = sides[p.userId] === side;
                    const count = side === 'A' ? sideA.length : sideB.length;
                    return (
                      <Button
                        key={side}
                        size="sm"
                        variant={active ? 'default' : 'outline'}
                        disabled={!active && count >= perSide}
                        onClick={() => setSides({ ...sides, [p.userId]: active ? null : side })}
                      >
                        {side}
                      </Button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Side A {sideA.length}/{perSide} · Side B {sideB.length}/{perSide}
        </p>
        <Button className="w-full" onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>
          Save pairs
        </Button>
      </CardContent>
    </Card>
  );
}

function SideBox({ label, names, winner }: { label: string; names: string[]; winner: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${winner ? 'border-primary bg-primary/10' : 'border-border'}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {label} {winner && <Trophy className="h-3.5 w-3.5 text-primary" />}
      </p>
      <p className="mt-1">{names.length ? names.join(' & ') : '—'}</p>
    </div>
  );
}

function ResultCard({ game, onSaved }: { game: BadmintonGameDetail; onSaved: () => void }) {
  const { toast } = useToast();
  const [score, setScore] = useState(game.resultScore ?? '');
  const [winner, setWinner] = useState<BadmintonSide | null>(game.winnerSide);
  useEffect(() => {
    setScore(game.resultScore ?? '');
    setWinner(game.winnerSide);
  }, [game.resultScore, game.winnerSide]);

  const mutation = useMutation({
    mutationFn: () => badmintonApi.recordResult(game.id, score, winner),
    onSuccess: () => {
      toast.success('Result saved');
      onSaved();
    },
    onError: (err) => toast.error('Could not save result', normalizeError(err).message),
  });

  if (!game.isOrganizer) {
    if (!game.resultScore && !game.winnerSide) return null;
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Result
          </span>
          <span className="text-sm">
            {game.resultScore ?? ''} {game.winnerSide && <Badge>Side {game.winnerSide} won</Badge>}
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Result</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={score} maxLength={60} placeholder="21-17, 19-21, 21-15" onChange={(e) => setScore(e.target.value)} />
        <div className="grid grid-cols-3 gap-2">
          {([null, 'A', 'B'] as const).map((s) => (
            <Button key={s ?? 'none'} size="sm" variant={winner === s ? 'default' : 'outline'} onClick={() => setWinner(s)}>
              {s ? `Side ${s} won` : 'No winner'}
            </Button>
          ))}
        </div>
        <Button className="w-full" onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
          Save result
        </Button>
      </CardContent>
    </Card>
  );
}
