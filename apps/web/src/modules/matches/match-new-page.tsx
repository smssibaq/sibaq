import { GameLocationPicker } from '@/components/location/game-location-picker';
import { manualLocation } from '@/components/location/location-service';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createMatchSchema, type CreateMatchFormData } from './schema';
import { useCreateMatch } from './api';
import { squadApi } from '../squads/api';
import type { Squad } from '@/types/contracts';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useToast } from '@/components/ui/toast';
import {
  Calendar,
  ArrowRight,
  AlertCircle,
  Users,
} from 'lucide-react';

export function MatchNewPage() {
  const { toast } = useToast();
  const createMatchMutation = useCreateMatch();

  // Extract squadId from route if present: /squads/:squadId/matches/new
  const pathParts = window.location.pathname.split('/');
  const routeSquadId = pathParts.includes('squads')
    ? pathParts[pathParts.indexOf('squads') + 1] || ''
    : '';

  const [squads, setSquads] = useState<Squad[]>([]);
  const [isLoadingSquads, setIsLoadingSquads] = useState(true);
  const [location, setLocation] = useState(manualLocation());
  const [serverError, setServerError] = useState<string | null>(null);

  // Default to tomorrow 8:00 PM IST
  const tomorrow = new Date(Date.now() + 86400000);
  const defaultDate = tomorrow.toISOString().slice(0, 10);
  const defaultTime = '20:00';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateMatchFormData>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      squadId: routeSquadId,
      title: 'Friday Night Turf 7s',
      mode: 'friendly',
      turfName: '',
      locationDescription: '',
      date: defaultDate,
      kickoffTime: defaultTime,
      rsvpDeadlineDate: '',
      rsvpDeadlineTime: '',
      playersPerTeam: 7,
    },
  });

  const selectedSquadId = watch('squadId');
  const selectedMode = watch('mode');
  const selectedPlayers = watch('playersPerTeam');

  // Load user's squads to support multi-squad users and ensure valid squad selection
  useEffect(() => {
    async function loadSquads() {
      try {
        const userSquads = await squadApi.listMySquads();
        setSquads(userSquads);
        if (!routeSquadId && userSquads.length > 0) {
          setValue('squadId', userSquads[0].id);
        }
      } catch (err) {
        console.error('Failed to load squads:', err);
      } finally {
        setIsLoadingSquads(false);
      }
    }
    loadSquads();
  }, [routeSquadId, setValue]);

  const onSubmit = async (data: CreateMatchFormData) => {
    setServerError(null);
    try {
      // Build ISO startsAt from date and kickoffTime in Asia/Kolkata
      // e.g. "2026-11-20T20:00:00+05:30"
      const istIsoString = `${data.date}T${data.kickoffTime}:00+05:30`;
      const utcStartsAt = new Date(istIsoString).toISOString();
      const finalTurf = data.locationDescription?.trim()
        ? `${data.turfName.trim()} (${data.locationDescription.trim()})`
        : data.turfName.trim();

      let utcRsvpDeadline: string | null = null;
      if (data.rsvpDeadlineDate && data.rsvpDeadlineTime) {
        utcRsvpDeadline = new Date(`${data.rsvpDeadlineDate}T${data.rsvpDeadlineTime}:00+05:30`).toISOString();
      }

      const matchId = await createMatchMutation.mutateAsync({
        squadId: data.squadId,
        title: data.title,
        mode: data.mode,
        turfName: finalTurf,
        location,
        startsAt: utcStartsAt,
        playersPerTeam: Number(data.playersPerTeam),
        rsvpDeadline: utcRsvpDeadline,
      });

      toast.success(
        'Match Scheduled!',
        `${data.title} fixture has been generated. Ready for attendance!`
      );
      window.location.href = `/matches/${matchId}`;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule match.';
      setServerError(msg);
      toast.error('Schedule Failed', msg);
    }
  };

  const totalPlayersNeeded =
    selectedMode === 'friendly' ? selectedPlayers * 2 : selectedPlayers;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule Turf Match"
        description="Pick kickoff time in IST, configure match mode, and set player requirements."
        badge="New Fixture"
      />

      <div className="max-w-3xl mx-auto">
        <Card className="border-border bg-surface shadow-modal">
          <CardHeader className="border-b border-border/80 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold">Match Configuration</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Initial teams (Team A & Team B or Single XI) will be automatically generated upon creation.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4 sm:pt-6">
            {serverError && (
              <div
                role="alert"
                className="mb-6 flex items-start gap-3 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger"
              >
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold">Error Creating Match</h5>
                  <p className="text-xs text-danger/90 mt-0.5">{serverError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Squad Selection (for multi-squad users) */}
              <FormField
                label="Host Squad"
                htmlFor="squadId"
                error={errors.squadId?.message}
                required
              >
                {isLoadingSquads ? (
                  <div className="h-10 w-full animate-pulse rounded-md bg-surface-subtle" />
                ) : (
                  <Select id="squadId" {...register('squadId')}>
                    {squads.map((sq) => (
                      <option key={sq.id} value={sq.id}>
                        {sq.name} ({sq.joinCode})
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>

              {/* Match Title */}
              <FormField
                label="Match Fixture Title"
                htmlFor="title"
                error={errors.title?.message}
                required
              >
                <Input
                  id="title"
                  placeholder="e.g. Kozhikode Derby, Friday Night 7s, Sunday Morning Kickoff"
                  {...register('title')}
                />
              </FormField>

              {/* Match Mode & Players Per Team */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Match Mode"
                  htmlFor="mode"
                  error={errors.mode?.message}
                  required
                >
                  <Select id="mode" {...register('mode')}>
                    <option value="friendly">Friendly Derby (Team A vs Team B)</option>
                    <option value="single">Practice Session (Single Team XI)</option>
                  </Select>
                </FormField>

                <FormField
                  label="Players Per Team (3–11)"
                  htmlFor="playersPerTeam"
                  error={errors.playersPerTeam?.message}
                  required
                >
                  <Select
                    id="playersPerTeam"
                    {...register('playersPerTeam', { valueAsNumber: true })}
                  >
                    <option value={3}>3v3 (Mini Turf / 3 per side)</option>
                    <option value={4}>4v4 (Cage Football / 4 per side)</option>
                    <option value={5}>5v5 (Futsal Format / 5 per side)</option>
                    <option value={6}>6v6 (Fast Turf / 6 per side)</option>
                    <option value={7}>7v7 (Standard Kerala Turf / 7 per side)</option>
                    <option value={8}>8v8 (Extended Turf / 8 per side)</option>
                    <option value={9}>9v9 (Intermediate Pitch / 9 per side)</option>
                    <option value={10}>10v10 (10 per side)</option>
                    <option value={11}>11v11 (Full XI Pitch)</option>
                  </Select>
                </FormField>
              </div>

              {/* Quorum Info Banner */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">
                    Required Quorum: <strong>{totalPlayersNeeded} Players</strong>
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {selectedMode === 'friendly' ? '2 teams of ' + selectedPlayers : '1 team of ' + selectedPlayers}
                </span>
              </div>

              {/* Date & Kickoff Time in Asia/Kolkata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Match Date"
                  htmlFor="date"
                  error={errors.date?.message}
                  required
                >
                  <Input id="date" type="date" {...register('date')} />
                </FormField>

                <FormField
                  label="Kickoff Time (Asia/Kolkata - IST)"
                  htmlFor="kickoffTime"
                  error={errors.kickoffTime?.message}
                  required
                >
                  <Input id="kickoffTime" type="time" {...register('kickoffTime')} />
                </FormField>
              </div>

              {/* Optional RSVP Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-border/80 bg-surface-subtle/40 p-4">
                <FormField
                  label="Availability Cutoff Date (Optional)"
                  htmlFor="rsvpDeadlineDate"
                  error={errors.rsvpDeadlineDate?.message}
                >
                  <Input id="rsvpDeadlineDate" type="date" {...register('rsvpDeadlineDate')} />
                </FormField>

                <FormField
                  label="Availability Cutoff Time (IST - Optional)"
                  htmlFor="rsvpDeadlineTime"
                  error={errors.rsvpDeadlineTime?.message}
                >
                  <Input id="rsvpDeadlineTime" type="time" {...register('rsvpDeadlineTime')} />
                </FormField>
              </div>

              <GameLocationPicker value={location} onChange={value=>{setLocation(value);setValue('turfName',value.name,{shouldValidate:true});}} disabled={createMatchMutation.isPending}/>
              {errors.turfName&&<p role="alert" className="text-xs text-danger">{errors.turfName.message}</p>}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (selectedSquadId) {
                      window.location.href = `/squads/${selectedSquadId}`;
                    } else {
                      window.location.href = '/dashboard';
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={createMatchMutation.isPending}
                  className="bg-primary text-primary-foreground font-bold hover:bg-primary-hover shadow-md min-h-[44px]"
                >
                  <span>Schedule Match</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
