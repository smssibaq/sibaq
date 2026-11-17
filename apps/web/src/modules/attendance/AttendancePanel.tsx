import { useState } from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AttendanceButton } from './AttendanceButton';
import { AttendanceSummary } from './AttendanceSummary';
import { AttendanceList } from './AttendanceList';
import {
  useMatchAttendance,
  useMyAttendance,
  useSetAttendance,
  useMatchWaitlist,
  useMyWaitlistPosition,
  useJoinWaitlist,
  useLeaveWaitlist,
} from './api';
import { useAttendanceRealtime } from './realtime';
import { useToast } from '@/components/ui/toast';
import { LoadingState } from '@/components/common/loading-state';
import { Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import type { MatchMode, AttendanceStatus } from './types';

export interface AttendancePanelProps {
  matchId: string;
  playersPerTeam: number;
  mode: MatchMode;
  matchStatus?: string;
  rsvpDeadline?: string | null;
  startsAt?: string;
  isAdminOrOwner?: boolean;
  enableRealtime?: boolean;
  className?: string;
}

export function AttendancePanel({
  matchId,
  playersPerTeam,
  mode,
  matchStatus = 'scheduled',
  rsvpDeadline,
  startsAt,
  isAdminOrOwner = false,
  enableRealtime = true,
  className,
}: AttendancePanelProps) {
  const { toast } = useToast();
  const [adminOverride, setAdminOverride] = useState(false);

  // Queries
  const {
    data: attendees = [],
    isLoading: isLoadingAttendees,
    refetch: refetchAttendees,
  } = useMatchAttendance(matchId);

  const {
    data: myAttendance,
    isLoading: isLoadingMyAttendance,
    refetch: refetchMyAttendance,
  } = useMyAttendance(matchId);

  const {
    data: waitlist = [],
    isLoading: isLoadingWaitlist,
    refetch: refetchWaitlist,
  } = useMatchWaitlist(matchId);

  const {
    data: myWaitlistPosition,
    refetch: refetchMyWaitlist,
  } = useMyWaitlistPosition(matchId);

  // Mutations
  const setAttendanceMutation = useSetAttendance();
  const joinWaitlistMutation = useJoinWaitlist();
  const leaveWaitlistMutation = useLeaveWaitlist();

  // Realtime subscription for multi-client updates
  useAttendanceRealtime({
    matchId,
    enabled: Boolean(matchId) && enableRealtime,
    onUpdate: () => {
      refetchAttendees();
      refetchMyAttendance();
      refetchWaitlist();
      refetchMyWaitlist();
    },
  });

  const playingCount = attendees.filter((a) => a.status === 'playing').length;
  const maybeCount = attendees.filter((a) => a.status === 'maybe').length;
  const notPlayingCount = attendees.filter((a) => a.status === 'not_playing').length;
  const maxCapacity = mode === 'friendly' ? playersPerTeam * 2 : playersPerTeam;
  const isCapacityReached = playingCount >= maxCapacity;

  // Deadline check
  const cutoffTime = rsvpDeadline || startsAt;
  const isCutoffPassed = Boolean(cutoffTime && new Date(cutoffTime).getTime() <= Date.now());
  const isCancelled = matchStatus === 'cancelled';
  const isCompleted = matchStatus === 'completed';

  const isRsvpDisabled = (isCutoffPassed && !(isAdminOrOwner && adminOverride)) || isCancelled || isCompleted;

  const handleStatusChange = async (status: AttendanceStatus) => {
    try {
      await setAttendanceMutation.mutateAsync({
        matchId,
        status,
        adminOverride: isAdminOrOwner && adminOverride,
      });

      const statusLabels: Record<AttendanceStatus, string> = {
        playing: 'Marked as Playing! Confirmed spot locked.',
        maybe: 'Marked as Maybe (tentative).',
        not_playing: 'Marked as Unavailable (Out).',
      };
      toast.success('RSVP Updated', statusLabels[status]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to save your attendance status.';
      if (msg.includes('MATCH_FULL') || msg.includes('Capacity reached')) {
        toast.warning(
          'Match is Full',
          `All ${maxCapacity} spots are taken. You can join the waitlist below to be auto-promoted!`
        );
      } else if (msg.includes('RSVP_DEADLINE_PASSED')) {
        toast.error('RSVP Closed', 'The cutoff deadline has passed for this fixture.');
      } else {
        toast.error('RSVP Update Failed', msg);
      }
    }
  };

  const handleJoinWaitlist = async () => {
    try {
      const position = await joinWaitlistMutation.mutateAsync(matchId);
      toast.success('Waitlist Joined', `You are #${position} in queue. You will be automatically promoted if a spot opens!`);
    } catch (err: unknown) {
      toast.error('Failed to Join Waitlist', err instanceof Error ? err.message : 'Error joining waitlist.');
    }
  };

  const handleLeaveWaitlist = async () => {
    try {
      await leaveWaitlistMutation.mutateAsync(matchId);
      toast.success('Waitlist Left', 'You have been removed from the waitlist queue.');
    } catch (err: unknown) {
      toast.error('Failed to Leave Waitlist', err instanceof Error ? err.message : 'Error leaving waitlist.');
    }
  };

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* RSVP Action Card */}
      <Card className="border-border bg-surface p-6 shadow-modal">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/80">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary mb-2">
              <Sparkles className="h-3 w-3" />
              <span>Smart Match Headcount</span>
            </div>
            <CardTitle className="text-xl font-bold">Your Match Availability</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {isCancelled
                ? 'This fixture has been cancelled.'
                : isCompleted
                ? 'This match has already concluded.'
                : isCutoffPassed
                ? 'The RSVP deadline has passed. Roster is locked.'
                : 'Select your status. When capacity is full, additional players join the queue.'}
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {isAdminOrOwner && isCutoffPassed && !isCancelled && !isCompleted && (
              <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-warning">
                <input
                  type="checkbox"
                  checked={adminOverride}
                  onChange={(e) => setAdminOverride(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>Admin Override Cutoff</span>
              </label>
            )}

            {isLoadingMyAttendance ? (
              <div className="text-xs text-muted-foreground py-2 px-4 animate-pulse">
                Checking RSVP...
              </div>
            ) : (
              <AttendanceButton
                currentStatus={myAttendance || null}
                onStatusChange={handleStatusChange}
                isLoading={setAttendanceMutation.isPending}
                disabled={isRsvpDisabled}
              />
            )}
          </div>
        </div>

        {/* Waitlist Status Callout if Waitlisted */}
        {myWaitlistPosition ? (
          <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20 text-warning font-bold">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-warning">
                  You Are on the Waitlist
                </span>
                <div className="text-sm font-bold text-foreground">
                  Position #{myWaitlistPosition} in queue · Auto-promoted when a spot opens
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLeaveWaitlist}
              isLoading={leaveWaitlistMutation.isPending}
              className="text-xs text-danger hover:bg-danger/10 hover:border-danger/40 min-h-[38px]"
            >
              Leave Waitlist
            </Button>
          </div>
        ) : isCapacityReached && myAttendance !== 'playing' && !isCancelled && !isCompleted && !isCutoffPassed ? (
          /* Callout to Join Waitlist when Full */
          <div className="mt-4 rounded-xl border border-primary/40 bg-primary/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Match Capacity Reached ({playingCount}/{maxCapacity})
                </span>
                <div className="text-sm font-semibold text-foreground">
                  All spots are taken. Join the waitlist to secure the next available slot!
                </div>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleJoinWaitlist}
              isLoading={joinWaitlistMutation.isPending}
              className="bg-primary text-primary-foreground font-bold hover:bg-primary-hover min-h-[38px]"
            >
              Join Waitlist Queue
            </Button>
          </div>
        ) : null}

        {/* Quorum and Count Summary */}
        <div className="pt-6">
          <AttendanceSummary
            playingCount={playingCount}
            maybeCount={maybeCount}
            notPlayingCount={notPlayingCount}
            waitlistCount={waitlist.length}
            playersPerTeam={playersPerTeam}
            mode={mode}
            rsvpDeadline={rsvpDeadline}
            isRsvpClosed={isCutoffPassed}
          />
        </div>
      </Card>

      {/* Roster Breakdown */}
      {isLoadingAttendees || isLoadingWaitlist ? (
        <LoadingState message="Loading match attendees roster..." />
      ) : (
        <AttendanceList attendees={attendees} waitlist={waitlist} />
      )}
    </div>
  );
}
