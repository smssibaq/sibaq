import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select } from '@/components/ui/select';
import { squadApi } from './api';
import { invitationApi } from '../invitations/api';
import { useSquadRealtime } from './use-squad-realtime';
import { useAuth } from '../auth/auth-provider';
import type { SquadDetail, SquadMember } from './types';
import type { SquadInvitation } from '../invitations/types';
import {
  Settings,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Share2,
  Trash2,
  Crown,
  Copy,
  Check,
} from 'lucide-react';
import { formatDate } from '@/lib/dates';

export function SquadSettingsPage() {
  const pathParts = window.location.pathname.split('/');
  const squadId = pathParts[2] || '';
  const { user } = useAuth();

  const [squad, setSquad] = useState<SquadDetail | null>(null);
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [invites, setInvites] = useState<SquadInvitation[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Invite creation
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Invite revocation dialog
  const [revokeInviteId, setRevokeInviteId] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Ownership transfer
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState<string>('');
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  const loadData = useCallback(async () => {
    try {
      if (!squadId) return;
      const [detailData, membersData, invitesData] = await Promise.all([
        squadApi.getSquadDetail(squadId),
        squadApi.listMembers(squadId),
        invitationApi.listInvites(squadId).catch(() => []),
      ]);
      if (detailData) {
        setSquad(detailData);
        setName(detailData.name);
        setDescription(detailData.description || '');
      }
      setMembers(membersData);
      setInvites(invitesData);
    } catch (err) {
      console.error('Failed to load squad settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [squadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime updates
  useSquadRealtime({ squadId, onUpdate: loadData });

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      await squadApi.updateSquad(squadId, { name, description });
      setStatusMessage({ type: 'success', text: 'Squad details updated successfully.' });
      await loadData();
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update squad settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateInvite = async () => {
    setIsGeneratingInvite(true);
    setStatusMessage(null);
    try {
      await invitationApi.createInvite(squadId);
      setStatusMessage({ type: 'success', text: 'New 7-day invitation link generated.' });
      await loadData();
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : err instanceof Error
          ? err.message
          : 'Failed to generate invitation link.';
      setStatusMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleRevokeInvite = async () => {
    if (!revokeInviteId) return;
    setIsRevoking(true);
    try {
      await invitationApi.revokeInvite(revokeInviteId);
      setStatusMessage({ type: 'success', text: 'Invitation token revoked.' });
      setRevokeInviteId(null);
      await loadData();
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to revoke invite.',
      });
    } finally {
      setIsRevoking(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedNewOwnerId) return;
    setIsTransferring(true);
    try {
      await squadApi.transferOwnership(squadId, selectedNewOwnerId);
      setStatusMessage({ type: 'success', text: 'Squad ownership transferred successfully.' });
      setIsTransferDialogOpen(false);
      await loadData();
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to transfer ownership.',
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const copyInvite = (invite: SquadInvitation) => {
    const url = invitationApi.buildInviteUrl(invite.id);
    navigator.clipboard.writeText(url);
    setCopiedTokenId(invite.id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  if (isLoading) {
    return (
      <LoadingState message="Loading squad configuration..." />
    );
  }

  if (!squad) {
    return (
      <EmptyState
        title="Squad Not Found"
        description="Could not locate squad settings."
        actionText="Back to Dashboard"
        onAction={() => (window.location.href = '/dashboard')}
      />
    );
  }

  // Permission Check: only owners and admins
  if (!squad.canManage) {
    return (
      <EmptyState
        title="Access Restricted"
        description="Only squad owners and administrators have permission to modify settings and invitation links."
        actionText="Back to Squad Hub"
        onAction={() => (window.location.href = `/squads/${squadId}`)}
      />
    );
  }

  const eligibleNewOwners = members.filter(
    (m) => m.status === 'active' && m.userId !== user?.id
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${squad.name} Settings`}
        description="Configure squad profile, manage active invitations, and govern permissions."
        badge="Squad Admin"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = `/squads/${squadId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            <span>Back to Squad Hub</span>
          </Button>
        }
      />

      {statusMessage && (
        <div
          className={`mb-6 flex items-center gap-3 rounded-xl border p-4 text-sm ${
            statusMessage.type === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-danger/30 bg-danger/10 text-danger'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-8">
        {/* 1. General Profile Settings */}
        <Card className="border-border bg-surface shadow-card">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <span>General Settings</span>
            </CardTitle>
            <CardDescription>
              Update squad display name and description.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveGeneral} className="space-y-6">
              <FormField label="Squad Name" htmlFor="squad-name" required>
                <Input
                  id="squad-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={3}
                  maxLength={50}
                  required
                />
              </FormField>

              <FormField label="Description & Turf Details" htmlFor="squad-desc">
                <Textarea
                  id="squad-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={250}
                  placeholder="Home turf, match nights, or squad guidelines"
                />
              </FormField>

              <div className="flex justify-end pt-2">
                <Button type="submit" isLoading={isSaving}>
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 2. Invitation Management */}
        <Card className="border-border bg-surface shadow-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary" />
                  <span>Shareable Invite Links</span>
                </CardTitle>
                <CardDescription>
                  Active 7-day invite links for your squad.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreateInvite}
                isLoading={isGeneratingInvite}
              >
                <span>+ New Invite Link</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {invites.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No active invitation tokens found. Generate one to invite new teammates.
              </div>
            ) : (
              invites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-foreground">
                      Invite Link
                    </p>
                    <p className="text-muted-foreground">
                      Valid until {formatDate(inv.expiresAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyInvite(inv)}
                      className="text-xs h-8"
                    >
                      {copiedTokenId === inv.id ? (
                        <Check className="h-3.5 w-3.5 text-success mr-1" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 mr-1" />
                      )}
                      <span>{copiedTokenId === inv.id ? 'Copied' : 'Copy Link'}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 text-danger border-danger/30 hover:bg-danger/10"
                      onClick={() => setRevokeInviteId(inv.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      <span>Revoke</span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 3. Danger Zone (Ownership Transfer) */}
        {squad.isOwner && (
          <Card className="border-danger/30 bg-surface shadow-card">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-danger">
                <Crown className="h-5 w-5 text-warning" />
                <span>Squad Ownership Transfer</span>
              </CardTitle>
              <CardDescription>
                Transfer primary squad ownership to another active player. You will transition to Squad Admin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {eligibleNewOwners.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No other active players in this squad to transfer ownership to.
                </p>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1">
                    <Select
                      value={selectedNewOwnerId}
                      onChange={(e) => setSelectedNewOwnerId(e.target.value)}
                    >
                      <option value="">-- Select New Squad Owner --</option>
                      {eligibleNewOwners.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.profile?.displayName || 'Player'} ({m.role})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    className="text-warning border-warning/40 hover:bg-warning/10"
                    disabled={!selectedNewOwnerId}
                    onClick={() => setIsTransferDialogOpen(true)}
                  >
                    <span>Transfer Ownership</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Revoke Invite Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(revokeInviteId)}
        onClose={() => setRevokeInviteId(null)}
        onConfirm={handleRevokeInvite}
        title="Revoke Invitation Link"
        message="Are you sure you want to revoke this invitation link? Anyone using it will no longer be able to join the squad."
        confirmText="Revoke Link"
        isDestructive
        isLoading={isRevoking}
      />

      {/* Ownership Transfer Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isTransferDialogOpen}
        onClose={() => setIsTransferDialogOpen(false)}
        onConfirm={handleTransferOwnership}
        title="Transfer Primary Ownership"
        message={`Are you sure you want to transfer ownership to ${
          eligibleNewOwners.find((m) => m.userId === selectedNewOwnerId)?.profile?.displayName || 'this player'
        }? You will become a Squad Admin. This cannot be undone by you.`}
        confirmText="Confirm Transfer"
        isDestructive
        isLoading={isTransferring}
      />
    </div>
  );
}
