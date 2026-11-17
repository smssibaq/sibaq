import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { squadApi } from './api';
import { useSquadRealtime } from './use-squad-realtime';
import { useAuth } from '../auth/auth-provider';
import type { SquadDetail, SquadMember } from './types';
import {
  Users,
  ArrowLeft,
  UserCheck,
  UserX,
  UserMinus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { formatDate } from '@/lib/dates';

export function SquadMembersPage() {
  const pathParts = window.location.pathname.split('/');
  const squadId = pathParts[2] || '';
  const { user } = useAuth();

  const [squad, setSquad] = useState<SquadDetail | null>(null);
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'active' | 'pending'>('active');

  // Confirmation dialogs state
  const [actionState, setActionState] = useState<{
    type: 'approve' | 'reject' | 'promote' | 'demote' | 'remove' | 'transfer' | 'leave';
    targetUser?: SquadMember;
    isOpen: boolean;
  }>({
    type: 'approve',
    isOpen: false,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      if (!squadId) return;
      const [detailData, membersData] = await Promise.all([
        squadApi.getSquadDetail(squadId),
        squadApi.listMembers(squadId),
      ]);
      setSquad(detailData);
      setMembers(membersData);
    } catch (err) {
      console.error('Failed to load squad members:', err);
    } finally {
      setIsLoading(false);
    }
  }, [squadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime updates
  useSquadRealtime({ squadId, onUpdate: loadData });

  const activeMembers = members.filter((m) => m.status === 'active');
  const pendingMembers = members.filter((m) => m.status === 'pending');

  const isOwner = squad?.isOwner ?? false;
  const isAdmin = squad?.isAdmin ?? false;
  const canManage = isOwner || isAdmin;

  // Handlers for member actions
  const handleConfirmAction = async () => {
    const { type, targetUser } = actionState;
    if (!targetUser || !squadId) return;

    setIsProcessing(true);
    setFeedback(null);

    try {
      if (type === 'approve') {
        await squadApi.approveMember(squadId, targetUser.userId);
        setFeedback({
          type: 'success',
          message: `${targetUser.profile?.displayName || 'Player'} has been approved and added to active roster.`,
        });
      } else if (type === 'reject') {
        await squadApi.rejectMember(squadId, targetUser.userId);
        setFeedback({
          type: 'success',
          message: `Join request from ${targetUser.profile?.displayName || 'Player'} was rejected.`,
        });
      } else if (type === 'promote') {
        await squadApi.setMemberRole(squadId, targetUser.userId, 'admin');
        setFeedback({
          type: 'success',
          message: `${targetUser.profile?.displayName || 'Player'} promoted to Squad Admin.`,
        });
      } else if (type === 'demote') {
        await squadApi.setMemberRole(squadId, targetUser.userId, 'player');
        setFeedback({
          type: 'success',
          message: `${targetUser.profile?.displayName || 'Player'} set to standard Player role.`,
        });
      } else if (type === 'remove') {
        await squadApi.removeMember(squadId, targetUser.userId);
        setFeedback({
          type: 'success',
          message: `${targetUser.profile?.displayName || 'Player'} removed from squad.`,
        });
      } else if (type === 'transfer') {
        await squadApi.transferOwnership(squadId, targetUser.userId);
        setFeedback({
          type: 'success',
          message: `Primary squad ownership transferred to ${targetUser.profile?.displayName || 'Player'}.`,
        });
      } else if (type === 'leave') {
        await squadApi.leaveSquad(squadId, user!.id);
        window.location.href = '/dashboard';
        return;
      }

      await loadData();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Action failed. Please try again.',
      });
    } finally {
      setIsProcessing(false);
      setActionState((prev) => ({ ...prev, isOpen: false }));
    }
  };

  if (isLoading) {
    return (
      <LoadingState message="Loading squad roster and permissions..." />
    );
  }

  if (!squad) {
    return (
      <EmptyState
        title="Squad Not Found"
        description="Could not locate squad roster details."
        actionText="Back to Dashboard"
        onAction={() => (window.location.href = '/dashboard')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${squad.name} Roster`}
        description="Manage squad members, approve join requests, and configure player roles."
        badge="Squad Governance"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = `/squads/${squadId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span>Back to Squad Hub</span>
            </Button>
          </div>
        }
      />

      {feedback && (
        <div
          className={`mb-6 flex items-center gap-3 rounded-xl border p-4 text-sm ${
            feedback.type === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-danger/30 bg-danger/10 text-danger'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tabs for Active Roster vs Pending Requests */}
      <div className="flex border-b border-border mb-6 overflow-x-auto scrollbar-none">
        <div className="flex items-center min-w-max">
          <button
            type="button"
            onClick={() => setSelectedTab('active')}
            className={`px-3.5 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              selectedTab === 'active'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">Roster</span>
            <span className="hidden sm:inline">Active Roster</span>
            <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs">
              {activeMembers.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('pending')}
            className={`px-3.5 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              selectedTab === 'pending'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">Requests</span>
            <span className="hidden sm:inline">Pending Requests</span>
            {pendingMembers.length > 0 && (
              <Badge variant="warning" className="ml-1 text-[10px] sm:text-xs">
                {pendingMembers.length}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: ACTIVE ROSTER */}
      {selectedTab === 'active' && (
        <div className="space-y-6">
          <Card className="border-border bg-surface shadow-card">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>Active Players ({activeMembers.length})</span>
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  Sorted by role priority
                </span>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {activeMembers.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No active players in this squad yet.
                </div>
              ) : (
                activeMembers.map((member) => {
                  const isCurrentTarget = member.userId === user?.id;
                  const isTargetOwner = member.role === 'owner';
                  const isTargetAdmin = member.role === 'admin';

                  return (
                    <div
                      key={member.userId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-surface-subtle transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar userId={member.userId}
                          src={member.profile?.avatarUrl}
                          fallback={member.profile?.displayName || 'P'}
                          size="md"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-foreground">
                              {member.profile?.displayName || 'Player'}
                            </p>
                            {isCurrentTarget && (
                              <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span>
                              Position:{' '}
                              <strong className="text-foreground">
                                {member.profile?.preferredPosition || 'Any'}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>Joined {formatDate(member.joinedAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={member.role} />

                        {/* Owner Controls */}
                        {isOwner && !isTargetOwner && (
                          <div className="flex items-center gap-1.5 ml-2">
                            {isTargetAdmin ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8"
                                onClick={() =>
                                  setActionState({
                                    type: 'demote',
                                    targetUser: member,
                                    isOpen: true,
                                  })
                                }
                              >
                                Demote to Player
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 text-primary border-primary/30 hover:bg-primary/10"
                                onClick={() =>
                                  setActionState({
                                    type: 'promote',
                                    targetUser: member,
                                    isOpen: true,
                                  })
                                }
                              >
                                <Sparkles className="h-3.5 w-3.5 mr-1" />
                                <span>Make Admin</span>
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 text-danger border-danger/30 hover:bg-danger/10"
                              onClick={() =>
                                setActionState({
                                  type: 'remove',
                                  targetUser: member,
                                  isOpen: true,
                                })
                              }
                            >
                              <UserMinus className="h-3.5 w-3.5 mr-1" />
                              <span>Kick</span>
                            </Button>
                          </div>
                        )}

                        {/* Admin Controls (Kicking regular players only) */}
                        {isAdmin && !isOwner && !isTargetOwner && !isTargetAdmin && !isCurrentTarget && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 text-danger border-danger/30 hover:bg-danger/10 ml-2"
                            onClick={() =>
                              setActionState({
                                type: 'remove',
                                targetUser: member,
                                isOpen: true,
                              })
                            }
                          >
                            <UserMinus className="h-3.5 w-3.5 mr-1" />
                            <span>Remove</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: PENDING REQUESTS */}
      {selectedTab === 'pending' && (
        <div className="space-y-6">
          <Card className="border-border bg-surface shadow-card">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  <span>Pending Membership Requests ({pendingMembers.length})</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {pendingMembers.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No pending membership requests right now. All players have been reviewed.
                </div>
              ) : (
                pendingMembers.map((member) => (
                  <div
                    key={member.userId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-surface-subtle transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar userId={member.userId}
                        src={member.profile?.avatarUrl}
                        fallback={member.profile?.displayName || 'P'}
                        size="md"
                      />
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {member.profile?.displayName || 'Prospective Player'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span>
                            Preferred Position:{' '}
                            <strong className="text-primary">
                              {member.profile?.preferredPosition || 'Any'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>Requested {formatDate(member.joinedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canManage ? (
                        <>
                          <Button
                            size="sm"
                            className="bg-primary text-primary-foreground font-bold hover:bg-primary-hover h-8"
                            onClick={() =>
                              setActionState({
                                type: 'approve',
                                targetUser: member,
                                isOpen: true,
                              })
                            }
                          >
                            <UserCheck className="h-3.5 w-3.5 mr-1" />
                            <span>Approve</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-danger border-danger/30 hover:bg-danger/10 h-8"
                            onClick={() =>
                              setActionState({
                                type: 'reject',
                                targetUser: member,
                                isOpen: true,
                              })
                            }
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" />
                            <span>Reject</span>
                          </Button>
                        </>
                      ) : (
                        <Badge variant="warning">Awaiting Captain Approval</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={actionState.isOpen}
        onClose={() => setActionState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAction}
        title={
          actionState.type === 'approve'
            ? 'Approve Squad Member'
            : actionState.type === 'reject'
            ? 'Reject Join Request'
            : actionState.type === 'promote'
            ? 'Promote to Squad Admin'
            : actionState.type === 'demote'
            ? 'Demote to Player'
            : actionState.type === 'remove'
            ? 'Remove Player from Squad'
            : actionState.type === 'transfer'
            ? 'Transfer Squad Ownership'
            : 'Leave Squad'
        }
        message={
          actionState.type === 'approve'
            ? `Approve ${actionState.targetUser?.profile?.displayName || 'player'} to join the active squad roster?`
            : actionState.type === 'reject'
            ? `Reject the join request from ${actionState.targetUser?.profile?.displayName || 'player'}?`
            : actionState.type === 'promote'
            ? `Grant Squad Admin permissions to ${actionState.targetUser?.profile?.displayName || 'player'}? Admins can schedule matches and approve new players.`
            : actionState.type === 'demote'
            ? `Revoke Admin privileges from ${actionState.targetUser?.profile?.displayName || 'player'}?`
            : actionState.type === 'remove'
            ? `Are you sure you want to kick ${actionState.targetUser?.profile?.displayName || 'player'} from the squad?`
            : actionState.type === 'transfer'
            ? `WARNING: This will transfer primary squad ownership to ${actionState.targetUser?.profile?.displayName || 'player'}. You will become a Squad Admin. This action cannot be undone.`
            : `Are you sure you want to leave ${squad.name}?`
        }
        confirmText={
          actionState.type === 'approve'
            ? 'Approve Player'
            : actionState.type === 'reject'
            ? 'Reject Request'
            : actionState.type === 'promote'
            ? 'Promote'
            : actionState.type === 'demote'
            ? 'Demote'
            : actionState.type === 'remove'
            ? 'Kick Member'
            : actionState.type === 'transfer'
            ? 'Transfer Ownership'
            : 'Leave Squad'
        }
        isDestructive={
          actionState.type === 'reject' ||
          actionState.type === 'remove' ||
          actionState.type === 'transfer' ||
          actionState.type === 'leave'
        }
        isLoading={isProcessing}
      />
    </div>
  );
}
