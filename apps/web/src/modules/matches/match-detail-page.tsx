import { useState, useEffect, useMemo } from 'react';
import { ExpensePanel } from '@/modules/expenses';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { useToast } from '@/components/ui/toast';
import { useMatch, useUpdateMatch, useCancelMatch } from './api';
import {
  useMatchAttendance,
  useMyAttendance,
  useSetAttendance,
  useMatchWaitlist,
  useMyWaitlistPosition,
  useJoinWaitlist,
  useLeaveWaitlist,
} from '../attendance/api';
import { useAttendanceRealtime } from '../attendance/realtime';
import { useTeamLineup } from '../teams/hooks/use-team-lineup';
import { findPresetForFormat, formatFromPlayersPerTeam } from '../teams/presets';
import { squadApi } from '../squads/api';
import { useAuth } from '../auth/auth-provider';
import type { MatchStatus } from './types';
import type { AttendanceStatus } from '../attendance/types';
import {
  formatDate,
  calculateCountdown,
} from '@/lib/dates';
import {
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Trophy,
  ArrowRight,
  Edit3,
  ChevronLeft,
  Users,
  Loader2,
  Sparkles,
  Info,
} from 'lucide-react';

export function MatchDetailPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  const pathParts = window.location.pathname.split('/');
  const matchId = pathParts[2] || '';

  // 1. Core Match Query
  const { data: match, isLoading: isLoadingMatch, isError, refetch: refetchMatch } = useMatch(matchId);
  const updateMatchMutation = useUpdateMatch(matchId);
  const cancelMatchMutation = useCancelMatch(matchId);

  // 2. Teams and Lineup Query
  const { teams = [], refetch: refetchTeams } = useTeamLineup(matchId);

  // 3. Attendance & Waitlist Queries
  const { data: attendees = [], refetch: refetchAttendees } = useMatchAttendance(matchId);
  const { data: myAttendance, isLoading: isLoadingMyAttendance, refetch: refetchMyAttendance } = useMyAttendance(matchId);
  const { data: waitlist = [], refetch: refetchWaitlist } = useMatchWaitlist(matchId);
  const { data: myWaitlistPosition, refetch: refetchMyWaitlist } = useMyWaitlistPosition(matchId);

  // 4. Mutations
  const setAttendanceMutation = useSetAttendance();
  const joinWaitlistMutation = useJoinWaitlist();
  const leaveWaitlistMutation = useLeaveWaitlist();

  // Admin permission state
  const [isAdminOrOwner, setIsAdminOrOwner] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<AttendanceStatus | null>(null);

  // Roster Tab Filter
  const [rosterTab, setRosterTab] = useState<'all' | 'playing' | 'maybe' | 'not_playing' | 'waitlist'>('all');

  // Edit match modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTurfName, setEditTurfName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editRsvpDeadlineDate, setEditRsvpDeadlineDate] = useState('');
  const [editRsvpDeadlineTime, setEditRsvpDeadlineTime] = useState('');
  const [editStatus, setEditStatus] = useState<MatchStatus>('scheduled');

  // Cancel match confirmation dialog state
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  // Countdown timer state
  const [countdown, setCountdown] = useState<{ formatted: string; isComplete: boolean }>({
    formatted: '00:00:00',
    isComplete: false,
  });

  // Verify squad owner/admin privileges
  useEffect(() => {
    async function checkRole() {
      if (!match?.squadId || !user) return;
      try {
        const members = await squadApi.listMembers(match.squadId);
        const myMember = members.find((m) => m.userId === user.id);
        const hasAdminRole = myMember?.role === 'owner' || myMember?.role === 'admin';
        setIsAdminOrOwner(Boolean(hasAdminRole));
      } catch (err) {
        console.warn('Failed to verify squad admin role:', err);
      }
    }
    checkRole();
  }, [match?.squadId, user]);

  // Realtime subscription
  useAttendanceRealtime({
    matchId,
    enabled: Boolean(matchId),
    onUpdate: () => {
      refetchMatch();
      refetchAttendees();
      refetchMyAttendance();
      refetchWaitlist();
      refetchMyWaitlist();
      refetchTeams();
    },
  });

  // Countdown effect
  useEffect(() => {
    if (!match?.startsAt) return;
    const updateTimer = () => {
      const cd = calculateCountdown(match.startsAt);
      setCountdown({ formatted: cd.formatted, isComplete: cd.isComplete });
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [match?.startsAt]);

  // Capacity calculations
  const maxCapacity = useMemo(() => {
    if (!match) return 10;
    return match.mode === 'friendly' ? match.playersPerTeam * 2 : match.playersPerTeam;
  }, [match]);

  const playingAttendees = useMemo(() => attendees.filter((a) => a.status === 'playing'), [attendees]);
  const maybeAttendees = useMemo(() => attendees.filter((a) => a.status === 'maybe'), [attendees]);
  const notPlayingAttendees = useMemo(() => attendees.filter((a) => a.status === 'not_playing'), [attendees]);

  const playingCount = playingAttendees.length;
  const maybeCount = maybeAttendees.length;
  const notPlayingCount = notPlayingAttendees.length;
  const isCapacityReached = playingCount >= maxCapacity;
  const capacityPercent = Math.min(100, Math.round((playingCount / maxCapacity) * 100));

  // Match status checks
  const isCancelled = match?.status === 'cancelled';
  const isCompleted = match?.status === 'completed';
  const cutoffTime = match?.rsvpDeadline || match?.startsAt;
  const isCutoffPassed = Boolean(cutoffTime && new Date(cutoffTime).getTime() <= Date.now());
  const isRsvpDisabled = (isCutoffPassed && !(isAdminOrOwner && adminOverride)) || isCancelled || isCompleted;

  // Find user's assigned team if any
  const myAssignedTeam = useMemo(() => {
    if (!user || !teams || teams.length === 0) return null;
    return teams.find((t) => t.players?.some((p) => p.userId === user.id)) || null;
  }, [user, teams]);

  // Source of truth for current user's RSVP status (synchronized from my-attendance and attendees cache)
  const currentRsvpStatus = useMemo(() => {
    if (myAttendance !== undefined && myAttendance !== null) {
      return myAttendance;
    }
    if (user?.id && attendees.length > 0) {
      const found = attendees.find((a) => a.userId === user.id);
      if (found) return found.status as AttendanceStatus;
    }
    return myAttendance ?? null;
  }, [myAttendance, attendees, user?.id]);

  // RSVP status change handler
  const handleStatusChange = async (newStatus: AttendanceStatus) => {
    if (isRsvpDisabled || setAttendanceMutation.isPending) return;
    if (currentRsvpStatus === newStatus) return;

    setPendingStatus(newStatus);
    try {
      await setAttendanceMutation.mutateAsync({
        matchId,
        status: newStatus,
        adminOverride: isAdminOrOwner && adminOverride,
      });

      const messages: Record<AttendanceStatus, string> = {
        playing: "You're confirmed for this match.",
        maybe: 'You might be joining this match.',
        not_playing: "You won't be playing this match.",
      };
      toast.success('Availability Saved', messages[newStatus]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to update availability.';
      if (msg.includes('MATCH_FULL') || msg.includes('Capacity reached')) {
        toast.warning(
          'Match is Full',
          `All ${maxCapacity} confirmed slots are taken. Join the waitlist to get auto-promoted!`
        );
      } else if (msg.includes('RSVP_DEADLINE_PASSED')) {
        toast.error('RSVP Locked', 'The cutoff deadline has passed for this match.');
      } else {
        toast.error('Update Failed', msg);
      }
    } finally {
      setPendingStatus(null);
    }
  };

  const handleJoinWaitlist = async () => {
    try {
      const position = await joinWaitlistMutation.mutateAsync(matchId);
      toast.success('Added to Waitlist', `You are #${position} in queue. You will be auto-promoted if a player drops out.`);
    } catch (err: unknown) {
      toast.error('Waitlist Error', err instanceof Error ? err.message : 'Failed to join waitlist.');
    }
  };

  const handleLeaveWaitlist = async () => {
    try {
      await leaveWaitlistMutation.mutateAsync(matchId);
      toast.success('Waitlist Left', 'You have been removed from the waitlist.');
    } catch (err: unknown) {
      toast.error('Error', err instanceof Error ? err.message : 'Failed to leave waitlist.');
    }
  };

  // Open edit modal
  const handleOpenEdit = () => {
    if (!match) return;
    setEditTitle(match.title);
    setEditTurfName(match.turfName);
    const d = new Date(match.startsAt);
    setEditDate(d.toISOString().slice(0, 10));
    setEditTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
    if (match.rsvpDeadline) {
      const dl = new Date(match.rsvpDeadline);
      setEditRsvpDeadlineDate(dl.toISOString().slice(0, 10));
      setEditRsvpDeadlineTime(
        `${dl.getHours().toString().padStart(2, '0')}:${dl.getMinutes().toString().padStart(2, '0')}`
      );
    } else {
      setEditRsvpDeadlineDate('');
      setEditRsvpDeadlineTime('');
    }
    setEditStatus(match.status);
    setIsEditModalOpen(true);
  };

  // Save edit modal
  const handleSaveEdit = async () => {
    try {
      const istIsoString = `${editDate}T${editTime}:00+05:30`;
      const utcStartsAt = new Date(istIsoString).toISOString();
      let utcRsvpDeadline: string | null = null;
      if (editRsvpDeadlineDate && editRsvpDeadlineTime) {
        utcRsvpDeadline = new Date(`${editRsvpDeadlineDate}T${editRsvpDeadlineTime}:00+05:30`).toISOString();
      }
      await updateMatchMutation.mutateAsync({
        title: editTitle.trim(),
        turfName: editTurfName.trim(),
        startsAt: utcStartsAt,
        status: editStatus,
        rsvpDeadline: utcRsvpDeadline,
      });
      setIsEditModalOpen(false);
      toast.success('Match Updated', 'Fixture details saved successfully.');
      refetchMatch();
    } catch (err: unknown) {
      toast.error('Update Failed', err instanceof Error ? err.message : 'Could not update match.');
    }
  };

  const handleConfirmCancel = async () => {
    try {
      await cancelMatchMutation.mutateAsync();
      setIsCancelConfirmOpen(false);
      toast.warning('Match Cancelled', 'Fixture status set to cancelled.');
      refetchMatch();
    } catch (err: unknown) {
      toast.error('Cancel Failed', err instanceof Error ? err.message : 'Could not cancel match.');
    }
  };

  // Filtered attendees for the roster tab
  const filteredAttendees = useMemo(() => {
    if (rosterTab === 'playing') return playingAttendees;
    if (rosterTab === 'maybe') return maybeAttendees;
    if (rosterTab === 'not_playing') return notPlayingAttendees;
    return attendees;
  }, [rosterTab, attendees, playingAttendees, maybeAttendees, notPlayingAttendees]);

  if (isLoadingMatch) {
    return <LoadingState message="Loading match fixture, attendance & teams..." />;
  }

  if (isError || !match) {
    return (
      <EmptyState
        title="Match Not Found"
        description="The requested football match fixture does not exist or has been removed."
        actionText="Back to Dashboard"
        onAction={() => (window.location.href = '/dashboard')}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Back link */}
      <div>
        <a
          href={match.squadId ? `/squads/${match.squadId}` : '/dashboard'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to {match.squadName ? match.squadName : 'Squad'}</span>
        </a>
      </div>

      {/* ========================================================================= */}
      {/* 1. MATCH HEADER                                                           */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-2.5 min-w-0">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-bold text-primary whitespace-nowrap">
                <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0" />
                <span>{match.mode === 'friendly' ? `${match.playersPerTeam}v${match.playersPerTeam} Friendly Derby` : `${match.playersPerTeam}v${match.playersPerTeam} Single Squad Practice`}</span>
              </span>

              <StatusBadge status={match.status} />

              {!isCancelled && !isCompleted && !countdown.isComplete && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-subtle border border-border px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold text-muted-foreground font-mono whitespace-nowrap">
                  <Clock className="h-3 w-3 text-primary shrink-0" />
                  <span>Kickoff in {countdown.formatted}</span>
                </span>
              )}
            </div>

            {/* Match Title */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight uppercase truncate">
              {match.title}
            </h1>

            {/* Supporting When & Where */}
            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{formatDate(match.startsAt, 'EEEE, dd MMM yyyy')}</span>
                <span className="text-muted-foreground">•</span>
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>{formatDate(match.startsAt, 'h:mm a')}</span>
              </div>

              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate max-w-[280px]" title={match.turfName}>
                  {match.turfName}
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
            {isAdminOrOwner && !isCancelled && (
              <>
                <Button variant="outline" size="sm" onClick={handleOpenEdit} className="text-xs min-h-[40px]">
                  <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCancelConfirmOpen(true)}
                  className="text-xs text-danger hover:bg-danger/10 hover:border-danger/30 min-h-[40px]"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  <span>Cancel</span>
                </Button>
              </>
            )}

            <Button
              className="bg-primary text-primary-foreground font-bold hover:bg-primary-hover shadow-md min-h-[44px] px-5"
              onClick={() => (window.location.href = `/matches/${matchId}/lineup`)}
            >
              <Trophy className="h-4 w-4 mr-2" />
              <span>View Lineup</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. YOUR MATCH AVAILABILITY — MOST IMPORTANT ACTION                        */}
      {/* ========================================================================= */}
      <Card className="rounded-2xl border-2 border-primary/30 bg-surface p-4 sm:p-6 shadow-md">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Your Match Availability</span>
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-foreground">
                Are You Playing?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Let your squad know if you&apos;re joining this match.
              </p>
            </div>

            {isAdminOrOwner && isCutoffPassed && !isCancelled && !isCompleted && (
              <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-warning self-start sm:self-auto">
                <input
                  type="checkbox"
                  checked={adminOverride}
                  onChange={(e) => setAdminOverride(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>Admin Override Cutoff</span>
              </label>
            )}
          </div>

          {/* Large Selection Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* 1. Playing Button */}
            <button
              type="button"
              disabled={isRsvpDisabled || setAttendanceMutation.isPending}
              onClick={() => handleStatusChange('playing')}
              className={`flex items-center justify-center gap-2.5 rounded-xl min-h-[56px] px-5 py-3 text-sm sm:text-base font-bold transition-all border ${
                currentRsvpStatus === 'playing'
                  ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.01]'
                  : 'bg-surface hover:bg-surface-subtle text-foreground border-border hover:border-primary/50'
              } ${(isRsvpDisabled || setAttendanceMutation.isPending) ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
            >
              {pendingStatus === 'playing' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2
                  className={`h-5 w-5 ${
                    currentRsvpStatus === 'playing' ? 'text-primary-foreground stroke-[2.5]' : 'text-primary'
                  }`}
                />
              )}
              <span>Playing</span>
            </button>

            {/* 2. Maybe Button */}
            <button
              type="button"
              disabled={isRsvpDisabled || setAttendanceMutation.isPending}
              onClick={() => handleStatusChange('maybe')}
              className={`flex items-center justify-center gap-2.5 rounded-xl min-h-[56px] px-5 py-3 text-sm sm:text-base font-bold transition-all border ${
                currentRsvpStatus === 'maybe'
                  ? 'bg-warning/20 text-warning border-warning shadow-md scale-[1.01]'
                  : 'bg-surface hover:bg-surface-subtle text-foreground border-border hover:border-warning/50'
              } ${(isRsvpDisabled || setAttendanceMutation.isPending) ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
            >
              {pendingStatus === 'maybe' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <HelpCircle
                  className={`h-5 w-5 ${
                    currentRsvpStatus === 'maybe' ? 'text-warning stroke-[2.5]' : 'text-muted-foreground'
                  }`}
                />
              )}
              <span>Maybe</span>
            </button>

            {/* 3. Can't Play Button */}
            <button
              type="button"
              disabled={isRsvpDisabled || setAttendanceMutation.isPending}
              onClick={() => handleStatusChange('not_playing')}
              className={`flex items-center justify-center gap-2.5 rounded-xl min-h-[56px] px-5 py-3 text-sm sm:text-base font-bold transition-all border ${
                currentRsvpStatus === 'not_playing'
                  ? 'bg-danger/20 text-danger border-danger shadow-md scale-[1.01]'
                  : 'bg-surface hover:bg-surface-subtle text-foreground border-border hover:border-danger/50'
              } ${(isRsvpDisabled || setAttendanceMutation.isPending) ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
            >
              {pendingStatus === 'not_playing' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <XCircle
                  className={`h-5 w-5 ${
                    currentRsvpStatus === 'not_playing' ? 'text-danger stroke-[2.5]' : 'text-muted-foreground'
                  }`}
                />
              )}
              <span>Can&apos;t Play</span>
            </button>
          </div>

          {/* Current Status Readout */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border/70 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Current status:</span>
              {isLoadingMyAttendance && !currentRsvpStatus ? (
                <span className="text-muted-foreground animate-pulse">Checking your response...</span>
              ) : currentRsvpStatus === 'playing' ? (
                <span className="font-bold text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>You&apos;re confirmed for this match.</span>
                </span>
              ) : currentRsvpStatus === 'maybe' ? (
                <span className="font-bold text-warning flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4" />
                  <span>You might be joining this match.</span>
                </span>
              ) : currentRsvpStatus === 'not_playing' ? (
                <span className="font-bold text-danger flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" />
                  <span>You won&apos;t be playing this match.</span>
                </span>
              ) : (
                <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-4 w-4" />
                  <span>You haven&apos;t responded yet.</span>
                </span>
              )}
            </div>

            {isCutoffPassed && !isCancelled && !isCompleted && (
              <span className="text-xs text-danger font-semibold">
                RSVP deadline passed · Roster locked
              </span>
            )}
          </div>

          {/* Waitlist Banner (if active) */}
          {myWaitlistPosition ? (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/20 text-warning font-bold">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-warning">
                    You Are on the Waitlist
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-foreground">
                    Position #{myWaitlistPosition} in queue · Auto-promoted when a spot opens
                  </p>
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
            <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Match Capacity Reached ({playingCount}/{maxCapacity})
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-foreground">
                    All spots are filled. Join the waitlist to secure the next opening!
                  </p>
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
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 3. YOUR TEAM / MATCH TEAMS                                                */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-foreground uppercase tracking-tight flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <span>Match Teams</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              {match.mode === 'friendly' ? 'Two-team friendly derby rosters & tactical formations' : 'Single squad lineup and tactical positions'}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = `/matches/${matchId}/lineup`)}
            className="text-xs"
          >
            Tactical Pitch
          </Button>
        </div>

        {teams && teams.length > 0 ? (
          <div className={`grid gap-4 ${match.mode === 'friendly' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            {teams.map((t) => {
              const isMyTeam = myAssignedTeam?.id === t.id;
              const assignedPlayerCount = t.players?.length ?? 0;

              return (
                <div
                  key={t.id}
                  onClick={() => (window.location.href = `/matches/${matchId}/lineup`)}
                  className={`group relative rounded-2xl border p-5 transition-all cursor-pointer shadow-sm ${
                    isMyTeam
                      ? 'border-primary/50 bg-primary/5 hover:border-primary hover:bg-primary/10'
                      : 'border-border bg-surface hover:border-border/80 hover:bg-surface-subtle'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-5 w-5 rounded-full border border-white/30 shrink-0 shadow-sm"
                        style={{ backgroundColor: t.color || '#B7F34B' }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                            {t.name}
                          </h4>
                          {isMyTeam && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary text-primary-foreground">
                              Your Team
                            </span>
                          )}
                        </div>
                        {(() => {
                          const fixtureFormat = formatFromPlayersPerTeam(match.playersPerTeam);
                          const teamPreset = findPresetForFormat(fixtureFormat, t.formation);
                          return (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Formation: <strong className="text-foreground">{teamPreset.name}</strong> · {assignedPlayerCount} {assignedPlayerCount === 1 ? 'Player' : 'Players'} Assigned
                            </p>
                          );
                        })()}
                      </div>
                    </div>

                    <span className="text-xs font-bold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1 shrink-0 mt-1">
                      <span>View Lineup</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center space-y-3">
            <Trophy className="h-8 w-8 text-muted-foreground mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-foreground">No Teams Generated Yet</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Open the Tactical Lineup Board to assign players into starting lineups.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => (window.location.href = `/matches/${matchId}/lineup`)}
              className="bg-primary text-primary-foreground font-bold hover:bg-primary-hover text-xs"
            >
              Open Lineup Board
            </Button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. MATCH ATTENDANCE (Who's Playing?)                                      */}
      {/* ========================================================================= */}
      <Card className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
              Match Attendance
            </h3>
            <div className="text-xl sm:text-2xl font-black text-foreground mt-0.5">
              {playingCount} of {maxCapacity} Players Confirmed
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCapacityReached ? (
              <Badge variant="success" className="text-xs font-bold px-2.5 py-1 gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Match Full ({playingCount}/{maxCapacity})</span>
              </Badge>
            ) : (
              <Badge variant="warning" className="text-xs font-bold px-2.5 py-1 gap-1">
                <Users className="h-3.5 w-3.5" />
                <span>Need {maxCapacity - playingCount} More</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-3 w-full overflow-hidden rounded-full bg-surface-subtle border border-border/60">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isCapacityReached ? 'bg-primary' : 'bg-primary/85'
              }`}
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
        </div>

        {/* Compact Inline Counts */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-semibold text-muted-foreground pt-1">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span>Playing: <strong className="text-foreground">{playingCount}</strong></span>
          </span>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-warning" />
            <span>Maybe: <strong className="text-foreground">{maybeCount}</strong></span>
          </span>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-danger" />
            <span>Can&apos;t Play: <strong className="text-foreground">{notPlayingCount}</strong></span>
          </span>
          {waitlist.length > 0 && (
            <>
              <span className="text-border">•</span>
              <span className="flex items-center gap-1.5 text-primary">
                <Clock className="h-3.5 w-3.5" />
                <span>Waitlist: <strong className="text-foreground">{waitlist.length}</strong></span>
              </span>
            </>
          )}
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 5. PLAYERS (Roster & Filter Tabs)                                         */}
      {/* ========================================================================= */}
      <Card className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span>Players ({attendees.length + waitlist.length})</span>
          </h3>

          <span className="text-xs text-muted-foreground">
            {playingCount} confirmed
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setRosterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              rosterTab === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground'
            }`}
          >
            All ({attendees.length})
          </button>

          <button
            type="button"
            onClick={() => setRosterTab('playing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              rosterTab === 'playing'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground'
            }`}
          >
            Playing ({playingCount})
          </button>

          <button
            type="button"
            onClick={() => setRosterTab('maybe')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              rosterTab === 'maybe'
                ? 'bg-warning text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground'
            }`}
          >
            Maybe ({maybeCount})
          </button>

          <button
            type="button"
            onClick={() => setRosterTab('not_playing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              rosterTab === 'not_playing'
                ? 'bg-danger text-white shadow-sm'
                : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground'
            }`}
          >
            Can&apos;t Play ({notPlayingCount})
          </button>

          {waitlist.length > 0 && (
            <button
              type="button"
              onClick={() => setRosterTab('waitlist')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                rosterTab === 'waitlist'
                  ? 'bg-warning/30 text-warning border border-warning shadow-sm'
                  : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground'
              }`}
            >
              Waitlist ({waitlist.length})
            </button>
          )}
        </div>

        {/* Players List */}
        {rosterTab === 'waitlist' ? (
          waitlist.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No players on the waitlist.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {waitlist.map((w) => (
                <div key={w.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={w.profile?.avatarUrl}
                      fallback={w.profile?.displayName || 'P'}
                      size="sm"
                    />
                    <div>
                      <h5 className="text-sm font-bold text-foreground">
                        {w.profile?.displayName || 'Squad Member'}
                      </h5>
                      <span className="text-[11px] text-muted-foreground">
                        Position in queue: #{w.queuePosition}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-warning/15 text-warning border border-warning/20">
                    Queue #{w.queuePosition}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : filteredAttendees.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No players currently in this category.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredAttendees.map((a) => (
              <div key={a.userId} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={a.profile?.avatarUrl}
                    fallback={a.profile?.displayName || 'P'}
                    size="sm"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-bold text-foreground">
                        {a.profile?.displayName || 'Squad Member'}
                      </h5>
                      {a.userId === user?.id && (
                        <span className="text-[10px] font-bold text-primary">(You)</span>
                      )}
                    </div>
                    {a.profile?.preferredPosition && (
                      <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-surface-subtle text-muted-foreground border border-border mt-0.5">
                        {a.profile.preferredPosition}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  {a.status === 'playing' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/20">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Confirmed</span>
                    </span>
                  ) : a.status === 'maybe' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-warning/15 text-warning border border-warning/20">
                      <HelpCircle className="h-3 w-3" />
                      <span>Maybe</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-danger/15 text-danger border border-danger/20">
                      <XCircle className="h-3 w-3" />
                      <span>Can&apos;t Play</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* DIALOGS: Edit Fixture & Cancel Confirmation                               */}
      {/* ========================================================================= */}
      <ExpensePanel gameId={match.id} />

      <Dialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Match Fixture"
        description="Update kickoff time, turf venue, and status."
      >
        <div className="space-y-4 py-2">
          <FormField label="Fixture Title" required>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="e.g. Friday Night Turf 7s"
            />
          </FormField>

          <FormField label="Turf Venue" required>
            <Input
              value={editTurfName}
              onChange={(e) => setEditTurfName(e.target.value)}
              placeholder="e.g. Decathlon Turf Arena, Kalamassery"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Match Date" required>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </FormField>

            <FormField label="Kickoff Time (IST)" required>
              <Input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Match Status">
            <Select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as MatchStatus)}
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress (Live)</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </FormField>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              isLoading={updateMatchMutation.isPending}
              className="bg-primary text-primary-foreground font-bold hover:bg-primary-hover"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel This Match Fixture?"
        message="Are you sure you want to cancel this match? Attendees will be notified that the match is cancelled."
        confirmText="Yes, Cancel Match"
        isDestructive={true}
        isLoading={cancelMatchMutation.isPending}
      />
    </div>
  );
}

