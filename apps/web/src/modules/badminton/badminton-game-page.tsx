import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, HelpCircle, MapPin, Trophy, X, Share2, Users } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { LoadingState } from '@/components/common/loading-state';
import { ErrorState } from '@/components/common/error-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/modules/auth/auth-provider';
import { normalizeError } from '@/lib/errors';
import { formatDateTime } from '@/lib/dates';
import type { BadmintonRsvpStatus, BadmintonSide } from '@/types/sports/badminton.db';
import { RatingsPanel } from '@/modules/ratings';
import { badmintonApi, badmintonKeys, type BadmintonGameDetail } from './api';
import { BadmintonLineup } from './badminton-lineup';
import { BadmintonEditGame } from './badminton-edit-game';

const RSVP_OPTIONS = [
  { value: 'in', label: "I'm in", icon: Check },
  { value: 'maybe', label: 'Maybe', icon: HelpCircle },
  { value: 'out', label: "Can't play", icon: X },
] as const;

export function BadmintonGamePage({ gameId }: { gameId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  useEffect(() => {
    const refresh = () => { void queryClient.invalidateQueries({ queryKey: badmintonKeys.all }); };
    const channel = supabase.channel(`realtime:badminton:${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'badminton_rsvps', filter: `game_id=eq.${gameId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'badminton_pairs', filter: `game_id=eq.${gameId}` }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [gameId, queryClient]);
  const { data: game, isLoading, error } = useQuery({
    queryKey: [...badmintonKeys.detail(gameId), user?.id],
    queryFn: () => badmintonApi.getGame(gameId, user?.id ?? null),
    enabled: Boolean(user),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: badmintonKeys.all });
  const rsvp = useMutation({
    mutationFn: (status: BadmintonRsvpStatus) => badmintonApi.setRsvp(gameId, status),
    onSuccess: async () => { await invalidate(); toast.success('Availability updated'); },
    onError: err => toast.error('RSVP failed', /GAME_FULL/.test(String((err as Error)?.message)) ? 'This game is full.' : normalizeError(err).message),
  });
  if (isLoading) return <LoadingState message="Loading game..." />;
  if (error || !game) return <ErrorState title="Game not available" message={error ? normalizeError(error).message : 'Game not found.'} />;
  const confirmed = game.players.filter(p => p.status === 'in');
  const full = confirmed.length >= game.capacity;
  const closed = ['cancelled', 'completed'].includes(game.status);
  async function share() {
    try { await navigator.clipboard.writeText(window.location.href); toast.success('Invite link copied'); }
    catch { toast.error('Could not copy link', 'Copy the page address to share this game.'); }
  }
  return <div className="min-w-0 space-y-5">
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap gap-2"><Badge className="capitalize">{game.format} badminton</Badge><Badge variant="outline" className="capitalize">{game.status}</Badge>{game.skillLevel && <Badge variant="outline">{game.skillLevel}</Badge>}</div>
          <h1 className="break-words text-xl font-black tracking-tight sm:text-3xl">{game.title}</h1>
          <p className="flex items-center gap-2 text-sm font-medium"><CalendarDays className="h-4 w-4 shrink-0 text-primary" />{formatDateTime(game.startsAt)}</p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0 text-primary" /><span className="break-words">{[game.venue, game.court].filter(Boolean).join(' · ') || 'Venue to be confirmed'}</span></p>
        </div>
        <div className="flex flex-wrap gap-2"><BadmintonEditGame game={game} onSaved={invalidate} /><Button variant="outline" onClick={share}><Share2 className="mr-2 h-4 w-4" />Share invite</Button></div>
      </div>
    </div>
    <Card className="rounded-2xl border-2 border-primary/30"><CardContent className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-primary">Your availability</p><h2 className="mt-1 text-lg font-bold">Ready to take the court?</h2></div><p className="text-2xl font-black text-primary">{confirmed.length}<span className="text-base text-muted-foreground"> / {game.capacity} in</span></p></div>
      <div role="progressbar" aria-label="Confirmed players" aria-valuenow={confirmed.length} aria-valuemin={0} aria-valuemax={game.capacity} className="h-2 overflow-hidden rounded-full bg-surface-subtle"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, confirmed.length / game.capacity * 100)}%` }} /></div>
      <p className="text-sm text-muted-foreground">{full ? 'All spots filled. See you on court!' : `${game.capacity - confirmed.length} spots remaining`} · {game.players.filter(p => p.status === 'maybe').length} maybe</p>
      {closed ? <p className="text-sm text-muted-foreground">Attendance is closed for this {game.status} game.</p> : <div className="grid grid-cols-3 gap-2">{RSVP_OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = (rsvp.isPending ? rsvp.variables : game.myStatus) === value;
        const disabled = value === 'in' && full && game.myStatus !== 'in';
        return <Button key={value} aria-pressed={active} className="min-h-12 px-2 text-xs sm:text-sm" variant={active ? 'default' : 'outline'} disabled={disabled || rsvp.isPending} onClick={() => rsvp.mutate(value)}><Icon className="mr-1 hidden h-4 w-4 shrink-0 sm:block" />{disabled ? 'Full' : label}</Button>;
      })}</div>}
      {rsvp.isPending && <p role="status" className="text-xs text-primary">Updating availability...</p>}
    </CardContent></Card>
    <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <BadmintonLineup key={game.id} game={game} onSaved={invalidate} />
      <Card className="min-w-0 rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Players <span className="ml-auto text-sm text-muted-foreground">{confirmed.length}/{game.capacity} in</span></CardTitle></CardHeader><CardContent className="space-y-2">
        {!game.players.length && <p className="py-3 text-sm text-muted-foreground">No responses yet. Share the invite to get your game started.</p>}
        {game.players.map(p => <div key={p.userId} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface-subtle/40 p-3"><Avatar src={p.avatarUrl} alt={p.displayName} fallback={p.displayName} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.displayName}</p><p className="text-xs text-muted-foreground">{p.status === 'in' ? 'Confirmed' : p.status === 'maybe' ? 'Maybe' : "Can't play"}</p></div>{game.pairs.some(pair => pair.userId === p.userId) && <Badge variant="outline">Side {game.pairs.find(pair => pair.userId === p.userId)?.side}</Badge>}</div>)}
      </CardContent></Card>
    </div>
    <ResultCard key={game.id} game={game} onSaved={invalidate} />
    <RatingsPanel gameId={game.id} />
  </div>;
}

function ResultCard({ game, onSaved }: { game: BadmintonGameDetail; onSaved: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [score, setScore] = useState(game.resultScore ?? '');
  const [winner, setWinner] = useState<BadmintonSide | null>(game.winnerSide);
  const mutation = useMutation({
    mutationFn: async () => {
      const sets = score.split(',').map(s => s.trim());
      if (!winner || !sets.length || sets.length > 3 || sets.some(s => !/^\d{1,2}\s*-\s*\d{1,2}$/.test(s))) throw new Error('Enter 1–3 set scores, for example 21-17, 21-19, and select a winner.');
      let aWins = 0; let bWins = 0;
      for (const set of sets) {
        const [a, b] = set.split('-').map(Number);
        const high = Math.max(a, b); const low = Math.min(a, b);
        if (high > 30 || high < 21 || (high === 30 && low < 28) || (high < 30 && high - low !== 2 && !(high === 21 && low <= 19)) || a === b) throw new Error('Each set must reach 21 with a two-point lead, or finish 30-29.');
        if (aWins === 2 || bWins === 2) throw new Error('No sets can follow the deciding set.');
        if (a > b) aWins++; else bWins++;
      }
      if (aWins === bWins || (winner === 'A' ? aWins < bWins : bWins < aWins)) throw new Error('The winner must match the set scores.');
      await badmintonApi.recordResult(game.id, score, winner);
    },
    onSuccess: async () => { await onSaved(); setEditing(false); toast.success('Result saved'); },
    onError: err => toast.error('Could not save result', normalizeError(err).message),
  });
  const canRecord = game.isOrganizer && game.status !== 'cancelled' && new Date(game.startsAt).getTime() <= Date.now();
  return <Card className="rounded-2xl"><CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2"><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" />Match result</CardTitle>{canRecord && !editing && <Button variant="outline" onClick={() => { setScore(game.resultScore ?? ''); setWinner(game.winnerSide); setEditing(true); }}>{game.resultScore ? 'Edit result' : 'Record result'}</Button>}</CardHeader><CardContent className="space-y-4">
    {game.resultScore ? <div className="rounded-xl border border-border bg-surface-subtle p-4"><div className="mb-3 flex items-center justify-between text-sm font-bold"><span>Side A</span><span className="text-xs text-muted-foreground">SET SCORES</span><span>Side B</span></div>{game.resultScore.split(',').map((set, i) => <div key={i} className="border-t border-border py-3 text-center text-xl font-black tracking-widest">{set.trim().replace('-', ' — ')}</div>)}{game.winnerSide && <p className="text-center text-sm font-bold text-primary">Side {game.winnerSide} wins</p>}</div> : <p className="text-sm text-muted-foreground">Results not recorded yet.</p>}
    {editing && <div className="space-y-3 border-t border-border pt-4"><label className="block space-y-2 text-sm font-medium"><span>Set scores (Side A – Side B)</span><Input disabled={mutation.isPending} value={score} maxLength={60} placeholder="21-17, 19-21, 21-15" onChange={e => setScore(e.target.value)} /></label><div className="grid grid-cols-2 gap-2">{(['A', 'B'] as const).map(side => <Button key={side} disabled={mutation.isPending} aria-pressed={winner === side} variant={winner === side ? 'default' : 'outline'} onClick={() => setWinner(side)}>Side {side} won</Button>)}</div><div className="flex gap-2"><Button className="flex-1" isLoading={mutation.isPending} onClick={() => mutation.mutate()}>Save result</Button><Button variant="outline" disabled={mutation.isPending} onClick={() => setEditing(false)}>Cancel</Button></div></div>}
  </CardContent></Card>;
}
