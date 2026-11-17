import { GameLocationPicker } from '@/components/location/game-location-picker';
import { manualLocation } from '@/components/location/location-service';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Plus, X, CalendarDays } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { squadApi } from '@/modules/squads/api';
import { queryKeys } from '@/infrastructure/query-keys';
import { normalizeError } from '@/lib/errors';
import { formatDate } from '@/lib/dates';
import type { BadmintonFormat } from '@/types/sports/badminton.db';
import { badmintonApi, badmintonKeys, type BadmintonGameListItem } from './api';
import {
  FeaturedFixtureCard,
  MatchStatusTabs,
  MatchFixtureCard,
} from '@/components/common/match-center-ui';

export function BadmintonHubPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location,setLocation] = useState(manualLocation());
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'live' | 'past'>('upcoming');

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

  // Categorize matches into upcoming, live, past matching Football architecture
  const { liveGames, upcomingGames, pastGames } = useMemo(() => {
    const now = Date.now();
    const live: BadmintonGameListItem[] = [];
    const upcoming: BadmintonGameListItem[] = [];
    const past: BadmintonGameListItem[] = [];

    for (const game of games) {
      const matchTime = new Date(game.startsAt).getTime();
      const isPastStatus = game.status === 'completed' || game.status === 'cancelled';
      const isLiveWindow =
        matchTime <= now &&
        now <= matchTime + 60 * 60 * 1000 &&
        !isPastStatus;

      if (game.status === 'in_progress' || isLiveWindow) {
        live.push(game);
      } else if (isPastStatus || matchTime + 60 * 60 * 1000 < now) {
        past.push(game);
      } else {
        upcoming.push(game);
      }
    }

    upcoming.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    past.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

    return { liveGames: live, upcomingGames: upcoming, pastGames: past };
  }, [games]);

  const activeGamesList =
    activeTab === 'live' ? liveGames : activeTab === 'upcoming' ? upcomingGames : pastGames;

  const nextUpcomingGame = upcomingGames[0] || liveGames[0] || null;

  const goToGame = (id: string) => navigate({ to: `/badminton/${id}` } as never);

  const createMutation = useMutation({
    mutationFn: () =>
      badmintonApi.createGame({
        squadId: form.squadId || managedSquads[0]?.id || '',
        title: form.title,
        venue: form.venue,
        location,
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

  if (isLoading) return <LoadingState message="Loading badminton games and match center..." />;

  return (
    <div className="space-y-6">
      {/* 1. Page Header (Exact Football Hierarchy) */}
      <PageHeader
        title="Badminton Match Center"
        description="Unified matchday schedule for singles & doubles. Track court reservations, availability updates, and player pairs."
        badge={upcomingGames.length > 0 ? `${upcomingGames.length} Upcoming` : 'Fixtures'}
        actions={
          canCreate ? (
            <Button
              size="sm"
              onClick={() => setShowForm((v) => !v)}
              className="bg-primary text-primary-foreground hover:bg-primary-hover font-bold shadow-sm text-xs"
            >
              {showForm ? <X className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
              <span>{showForm ? 'Cancel' : 'Schedule Game'}</span>
            </Button>
          ) : null
        }
      />

      {/* Inline Create Fixture Card */}
      {showForm && (
        <Card className="border-primary/40 bg-surface shadow-modal animate-in fade-in">
          <CardHeader>
            <CardTitle className="text-base font-extrabold text-foreground">Schedule Badminton Game</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (formValid) createMutation.mutate();
              }}
            >
              <label className="space-y-1 text-xs font-semibold text-foreground sm:col-span-2">
                <span>Select Squad</span>
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

              <label className="space-y-1 text-xs font-semibold text-foreground sm:col-span-2">
                <span>Game Title</span>
                <Input
                  value={form.title}
                  placeholder="e.g. Saturday Evening Doubles"
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>

              <label className="space-y-1 text-xs font-semibold text-foreground">
                <span>Format</span>
                <Select
                  value={form.format}
                  onChange={(e) => setForm({ ...form, format: e.target.value as BadmintonFormat })}
                >
                  <option value="doubles">Doubles (4 players)</option>
                  <option value="singles">Singles (2 players)</option>
                </Select>
              </label>

              <label className="space-y-1 text-xs font-semibold text-foreground">
                <span>Starts At (IST)</span>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </label>

              <div className="sm:col-span-2"><GameLocationPicker value={location} onChange={value=>{setLocation(value);setForm({...form,venue:value.name});}} disabled={createMutation.isPending}/></div>


              <label className="space-y-1 text-xs font-semibold text-foreground">
                <span>Court Number</span>
                <Input
                  value={form.court}
                  placeholder="e.g. Court 3"
                  onChange={(e) => setForm({ ...form, court: e.target.value })}
                />
              </label>

              <div className="sm:col-span-2 pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-primary text-primary-foreground font-bold"
                  disabled={!formValid}
                  isLoading={createMutation.isPending}
                >
                  Create Game
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 2. Featured Next Match Card (If upcoming exists) */}
      {nextUpcomingGame && (
        <FeaturedFixtureCard
          startsAt={nextUpcomingGame.startsAt}
          formatBadge={nextUpcomingGame.format === 'singles' ? 'Singles (1v1)' : 'Doubles (2v2)'}
          title={nextUpcomingGame.title}
          subtitle={nextUpcomingGame.court ? `Court ${nextUpcomingGame.court}` : 'Badminton Game'}
          dateText={formatDate(nextUpcomingGame.startsAt)}
          venueText={nextUpcomingGame.venue}
          lineupText="Pairs & Lineup"
          rsvpText="Match Details"
          onLineup={() => goToGame(nextUpcomingGame.id)}
          onRsvp={() => goToGame(nextUpcomingGame.id)}
        />
      )}

      {/* 3. Match Status Tabs (Upcoming / Live / Past) */}
      <MatchStatusTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        upcomingCount={upcomingGames.length}
        liveCount={liveGames.length}
        pastCount={pastGames.length}
      />

      {/* 4. Match Cards Grid */}
      {activeGamesList.length === 0 ? (
        <EmptyState
          title={
            activeTab === 'live'
              ? 'No Live Games Right Now'
              : activeTab === 'upcoming'
              ? 'No Upcoming Badminton Games'
              : 'No Past Games'
          }
          description={
            activeTab === 'upcoming'
              ? 'Schedule a badminton match to coordinate court time and players.'
              : 'Past games will appear here after completion.'
          }
          icon={<CalendarDays className="h-6 w-6 text-primary" />}
          actionText={activeTab === 'upcoming' && canCreate ? 'Schedule Game' : undefined}
          onAction={activeTab === 'upcoming' && canCreate ? () => setShowForm(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeGamesList.map((g) => (
            <MatchFixtureCard
              key={g.id}
              formatBadge={g.format === 'singles' ? 'Singles (1v1)' : 'Doubles (2v2)'}
              status={g.status}
              title={g.title}
              subtitle={g.court ? `Court: ${g.court}` : 'Badminton Match'}
              dateText={formatDate(g.startsAt)}
              venueText={g.venue}
              playingCount={g.confirmedCount}
              capacity={g.capacity}
              lineupText="Pairs"
              rsvpText="Availability"
              onLineup={() => goToGame(g.id)}
              onRsvp={() => goToGame(g.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
