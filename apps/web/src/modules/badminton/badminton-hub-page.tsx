import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { CalendarDays, MapPin, Plus, Users, X } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { squadApi } from '@/modules/squads/api';
import { queryKeys } from '@/infrastructure/query-keys';
import { normalizeError } from '@/lib/errors';
import { formatDateTime } from '@/lib/dates';
import type { BadmintonFormat } from '@/types/sports/badminton.db';
import { badmintonApi, badmintonKeys } from './api';

export function BadmintonHubPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    squadId: '',
    title: '',
    venue: '',
    court: '',
    startsAt: '',
    format: 'doubles' as BadmintonFormat,
    skillLevel: '',
  });

  const { data: squads = [] } = useQuery({
    queryKey: queryKeys.squads.mySquads,
    queryFn: () => squadApi.listMySquads(),
  });
  const managedSquads = useMemo(
    () => squads.filter((s) => s.role === 'owner' || s.role === 'admin'),
    [squads]
  );

  const { data: games = [], isLoading } = useQuery({
    queryKey: badmintonKeys.list,
    queryFn: () => badmintonApi.listGames(),
  });

  const { upcoming, past } = useMemo(() => {
    const now = Date.now() - 2 * 60 * 60 * 1000;
    return {
      upcoming: games.filter((g) => new Date(g.startsAt).getTime() >= now && g.status !== 'cancelled'),
      past: games.filter((g) => new Date(g.startsAt).getTime() < now || g.status === 'cancelled').reverse(),
    };
  }, [games]);

  const goToGame = (id: string) => navigate({ to: `/badminton/${id}` } as never);

  const createMutation = useMutation({
    mutationFn: () =>
      badmintonApi.createGame({
        squadId: form.squadId || managedSquads[0]?.id || '',
        title: form.title,
        venue: form.venue,
        court: form.court,
        startsAt: form.startsAt,
        format: form.format,
        skillLevel: form.skillLevel,
      }),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: badmintonKeys.all });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast.success('Game created', 'Share it with your squad so they can confirm.');
      setShowForm(false);
      goToGame(id);
    },
    onError: (err) => toast.error('Could not create game', normalizeError(err).message),
  });

  const canCreate = managedSquads.length > 0;
  const formValid = form.title.trim().length >= 2 && form.startsAt && (form.squadId || managedSquads[0]);

  if (isLoading) return <LoadingState message="Loading badminton games..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Badminton"
        description="Singles or doubles. Create a game, let players confirm, then set the pairs."
        badge={upcoming.length ? `${upcoming.length} upcoming` : undefined}
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              {showForm ? <X className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
              {showForm ? 'Close' : 'New game'}
            </Button>
          ) : null
        }
      />

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New badminton game</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (formValid) createMutation.mutate();
              }}
            >
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="font-medium">Squad</span>
                <Select
                  value={form.squadId || managedSquads[0]?.id || ''}
                  onChange={(e) => setForm({ ...form, squadId: e.target.value })}
                >
                  {managedSquads.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="font-medium">Title</span>
                <Input
                  value={form.title}
                  placeholder="Friday night doubles"
                  maxLength={80}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Format</span>
                <Select
                  value={form.format}
                  onChange={(e) => setForm({ ...form, format: e.target.value as BadmintonFormat })}
                >
                  <option value="doubles">Doubles (4 players)</option>
                  <option value="singles">Singles (2 players)</option>
                </Select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Starts at</span>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Venue</span>
                <Input
                  value={form.venue}
                  placeholder="Indoor stadium"
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Court</span>
                <Input
                  value={form.court}
                  placeholder="Court 3"
                  onChange={(e) => setForm({ ...form, court: e.target.value })}
                />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="font-medium">Skill level (optional)</span>
                <Select
                  value={form.skillLevel}
                  onChange={(e) => setForm({ ...form, skillLevel: e.target.value })}
                >
                  <option value="">Any</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </Select>
              </label>
              <div className="sm:col-span-2">
                <Button type="submit" className="w-full" disabled={!formValid} isLoading={createMutation.isPending}>
                  Create game
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {games.length === 0 ? (
        <EmptyState
          title="No badminton games yet"
          description={
            canCreate
              ? 'Create the first one and invite your squad.'
              : 'Ask a squad owner or admin to schedule a game.'
          }
        />
      ) : (
        <div className="space-y-6">
          <GameSection title="Upcoming" games={upcoming} onOpen={goToGame} />
          <GameSection title="Past" games={past} onOpen={goToGame} />
        </div>
      )}
    </div>
  );
}

function GameSection({
  title,
  games,
  onOpen,
}: {
  title: string;
  games: Awaited<ReturnType<typeof badmintonApi.listGames>>;
  onOpen: (id: string) => void;
}) {
  if (games.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {games.map((g) => {
          const full = g.confirmedCount >= g.capacity;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onOpen(g.id)}
              className="text-left rounded-lg border border-border bg-surface p-4 hover:border-primary/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-foreground truncate">{g.title}</p>
                <Badge variant={full ? 'success' : 'secondary'}>
                  {g.confirmedCount} / {g.capacity}
                </Badge>
              </div>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> {formatDateTime(g.startsAt)}
                </p>
                {(g.venue || g.court) && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {[g.venue, g.court].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="flex items-center gap-1.5 capitalize">
                  <Users className="h-3.5 w-3.5" /> {g.format}
                  {g.status === 'cancelled' && <span className="text-danger normal-case"> · cancelled</span>}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
