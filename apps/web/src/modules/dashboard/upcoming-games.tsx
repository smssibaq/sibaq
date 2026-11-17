import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { CalendarDays, ChevronRight, MapPin } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ComingSoonSports, useSports } from '@/components/common/sport-switcher';
import { gamePath } from '@/app/sport-modules';
import { formatDateTime } from '@/lib/dates';

export function UpcomingGames() {
  const navigate = useNavigate();
  const { data: sports = [] } = useSports();
  const { data: games = [], isLoading } = useQuery({
    queryKey: ['games', 'upcoming'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('id, sport, title, venue, starts_at, status')
        .gte('starts_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .neq('status', 'cancelled')
        .order('starts_at', { ascending: true })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const sportName = (key: string) => sports.find((s) => s.key === key)?.name ?? key;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming games</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : games.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming games in any sport yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {games.map((g) => {
              const path = gamePath(g.sport, g.id);
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    disabled={!path}
                    onClick={() => path && navigate({ to: path } as never)}
                    className="w-full flex items-center gap-3 py-2.5 text-left disabled:opacity-60"
                  >
                    <Badge variant="outline" className="shrink-0">
                      {sportName(g.sport)}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{g.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                        <CalendarDays className="h-3 w-3 shrink-0" /> {formatDateTime(g.starts_at)}
                        {g.venue && (
                          <>
                            <MapPin className="h-3 w-3 shrink-0 ml-1" /> {g.venue}
                          </>
                        )}
                      </p>
                    </div>
                    {path && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <ComingSoonSports />
      </CardContent>
    </Card>
  );
}
