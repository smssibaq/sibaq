import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { SquadLogo } from './squad-logo';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { squadApi } from './api';
import { invitationApi } from '../invitations/api';
import { useSquadRealtime } from './use-squad-realtime';
import { useAuth } from '../auth/auth-provider';
import type { SquadDetail, SquadMember } from './types';
import {
  Users,
  Plus,
  Copy,
  Check,
  Settings,
  Share2,
  Clock,
  UserCheck,
  LogOut,
  AlertCircle,
} from 'lucide-react';

export function SquadDetailPage() {
  const pathParts = window.location.pathname.split('/');
  const squadId = pathParts[2] || '';
  const { user } = useAuth();

  const [squad, setSquad] = useState<SquadDetail | null>(null);
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copiedInviteUrl, setCopiedInviteUrl] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Leave squad confirm dialog
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

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
      console.error('Failed to load squad:', err);
    } finally {
      setIsLoading(false);
    }
  }, [squadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime updates
  useSquadRealtime({ squadId, onUpdate: loadData });

  const copyRoomCode = () => {
    if (!squad?.joinCode) return;
    navigator.clipboard.writeText(squad.joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleGenerateInvite = async () => {
    setIsGeneratingInvite(true);
    setInviteError(null);
    try {
      const token = await invitationApi.createInvite(squadId);
      setInviteToken(token);
    } catch (err: unknown) {
      if (squad?.joinCode) {
        setInviteToken(squad.joinCode);
      } else {
        const msg =
          typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : err instanceof Error
            ? err.message
            : 'Failed to generate invitation link.';
        setInviteError(msg);
      }
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const copyInviteLink = () => {
    if (!inviteToken) return;
    const url = invitationApi.buildInviteUrl(inviteToken);
    navigator.clipboard.writeText(url);
    setCopiedInviteUrl(true);
    setTimeout(() => setCopiedInviteUrl(false), 2000);
  };

  const handleLeaveSquad = async () => {
    if (!user || !squadId) return;
    setIsLeaving(true);
    try {
      await squadApi.leaveSquad(squadId, user.id);
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Failed to leave squad:', err);
      setIsLeaving(false);
      setIsLeaveOpen(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingState message="Loading squad details and roster..." />
    );
  }

  if (!squad) {
    return (
      <EmptyState
        title="Squad Not Found"
        description="The requested squad does not exist or you do not have permission to view it."
        actionText="Back to Dashboard"
        onAction={() => {
          window.location.href = '/dashboard';
        }}
      />
    );
  }

  const activeMembers = members.filter((m) => m.status === 'active');
  const isPendingMember = squad.currentUserStatus === 'pending';

  return (
    <div className="space-y-8">
      <PageHeader
        title={squad.name}
        leading={<SquadLogo squadId={squad.id} size="lg" />}
        description={squad.description || 'Kerala turf squad'}
        badge="Squad Hub"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsInviteOpen(true);
                if (!inviteToken) {
                  if (squad?.joinCode) {
                    setInviteToken(squad.joinCode);
                  }
                  handleGenerateInvite();
                }
              }}
            >
              <Share2 className="h-4 w-4 mr-1.5 text-primary" />
              <span>Invite</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = `/squads/${squadId}/members`)}
            >
              <Users className="h-4 w-4 mr-1.5 text-primary" />
              <span>Members ({activeMembers.length})</span>
            </Button>

            {squad.canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = `/squads/${squadId}/settings`)}
              >
                <Settings className="h-4 w-4 mr-1.5" />
                <span>Settings</span>
              </Button>
            )}

            {!squad.isOwner && (
              <Button
                variant="outline"
                size="sm"
                className="text-danger hover:text-danger hover:bg-danger/10 border-danger/30"
                onClick={() => setIsLeaveOpen(true)}
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                <span>Leave</span>
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => (window.location.href = `/squads/${squadId}/matches/new`)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span>New Match</span>
            </Button>
          </div>
        }
      />

      {/* Pending status alert for current user */}
      {isPendingMember && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          <Clock className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">Membership Pending Approval</p>
            <p className="text-xs opacity-90 mt-0.5">
              Your join request has been recorded. Once the squad captain or administrator approves your request, you can participate in matches and lineups.
            </p>
          </div>
        </div>
      )}

      {/* Admin notification for pending join requests */}
      {squad.canManage && squad.pendingMemberCount > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-foreground">
          <div className="flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="font-bold text-foreground">
                {squad.pendingMemberCount} Pending Join {squad.pendingMemberCount === 1 ? 'Request' : 'Requests'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                New teammates are waiting to join this squad roster.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => (window.location.href = `/squads/${squadId}/members`)}
            className="text-xs font-bold"
          >
            <span>Review Requests</span>
          </Button>
        </div>
      )}

      {/* Squad summary: one compact card instead of three tall ones */}
      <Card className="mb-6 sm:mb-8">
        <CardContent className="grid grid-cols-1 gap-4 p-4 pt-4 sm:grid-cols-3 sm:gap-6 sm:p-5 sm:pt-5">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Join code</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="min-w-0 truncate font-mono text-base font-bold tracking-wider text-primary select-all sm:text-lg" title={squad.joinCode}>
                {squad.joinCode}
              </span>
              <Button size="sm" variant="secondary" onClick={copyRoomCode} className="shrink-0 px-2.5" aria-label="Copy join code">
                {copiedCode ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="ml-1 text-xs">{copiedCode ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Friends enter this on the Join Squad page.</p>
          </div>

          <div className="min-w-0 sm:border-l sm:border-border sm:pl-6">
            <p className="text-xs text-muted-foreground">Players</p>
            <p className="mt-1 text-xl font-bold leading-tight text-foreground sm:text-2xl">{activeMembers.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeMembers.length === 1 ? 'player is' : 'players are'} in this squad
            </p>
          </div>

          <div className="min-w-0 sm:border-l sm:border-border sm:pl-6">
            <p className="text-xs text-muted-foreground">Your role</p>
            <div className="mt-1 flex items-center gap-2">
              {squad.currentUserRole ? (
                <StatusBadge status={squad.currentUserRole} />
              ) : (
                <span className="text-sm font-semibold text-foreground">{squad.isOwner ? 'Owner' : 'Player'}</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {squad.isOwner
                ? 'You manage this squad'
                : squad.isAdmin
                ? 'You can approve players and create games'
                : 'You can join games and set your availability'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Squad Roster Preview Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span>Squad Roster Preview</span>
          </h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => (window.location.href = `/squads/${squadId}/members`)}
            className="text-xs font-bold text-primary hover:text-primary-hover"
          >
            <span>View All ({activeMembers.length}) →</span>
          </Button>
        </div>

        <Card className="border-border bg-surface shadow-card divide-y divide-border">
          {activeMembers.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No active players found yet. Share your join code to add players.
            </div>
          ) : (
            activeMembers.slice(0, 6).map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-4 hover:bg-surface-subtle transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar userId={member.userId}
                    src={member.profile?.avatarUrl}
                    fallback={member.profile?.displayName || 'P'}
                    size="md"
                  />
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {member.profile?.displayName || 'Player'}
                      {member.userId === user?.id && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">(You)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Position: <span className="text-primary font-semibold">{member.profile?.preferredPosition || 'Any'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={member.role} />
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
      {/* Invite Modal */}
      <Dialog
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite Teammates"
        description="Share a secure invite link or your squad join code with friends."
      >
        <div className="space-y-6 pt-2">
          {inviteError && (
            <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          {/* Option 1: 7-Day Link */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Shareable Invite Link (Valid for 7 Days)
            </label>
            {inviteToken ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={invitationApi.buildInviteUrl(inviteToken)}
                  className="flex-1 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-xs font-mono text-foreground focus:outline-none select-all"
                />
                <Button size="sm" onClick={copyInviteLink} className="shrink-0">
                  {copiedInviteUrl ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  <span className="ml-1 text-xs">{copiedInviteUrl ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGenerateInvite}
                isLoading={isGeneratingInvite}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                <span>Generate New Invite Link</span>
              </Button>
            )}
            <p className="text-[11px] text-muted-foreground">
              Share this link directly with teammates via WhatsApp or messaging apps.
            </p>
          </div>

          {/* Option 2: Room Code */}
          <div className="rounded-xl border border-border bg-surface-subtle p-4 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Or Share Squad Room Code
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-black text-primary select-all">
                {squad.joinCode}
              </span>
              <Button size="sm" variant="secondary" onClick={copyRoomCode}>
                {copiedCode ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                <span className="ml-1 text-xs">{copiedCode ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Teammates can enter this code in the Join Squad page.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Leave Squad Confirm Dialog */}
      <ConfirmDialog
        isOpen={isLeaveOpen}
        onClose={() => setIsLeaveOpen(false)}
        onConfirm={handleLeaveSquad}
        title="Leave Squad"
        message={`Are you sure you want to leave ${squad.name}? You will need to re-join using an invite link or room code.`}
        confirmText="Leave Squad"
        isDestructive
        isLoading={isLeaving}
      />
    </div>
  );
}
