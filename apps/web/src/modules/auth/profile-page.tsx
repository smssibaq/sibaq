import React, { useState, useEffect } from 'react';
import { useAuth } from './auth-provider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { FormField } from '../../components/ui/form-field';
import { Avatar } from '../../components/ui/avatar';
import { StatusBadge } from '../../components/ui/status-badge';
import { supabase } from '../../lib/supabase/client';
import { uploadAvatarImage } from '../../lib/supabase/storage';
import type { FootballPosition } from '../../types/database.types';
import {
  Shield,
  Zap,
  Target,
  Trophy,
  Check,
  AlertCircle,
  CheckCircle2,
  Upload,
  User as UserIcon,
  Sparkles,
  Loader2,
} from 'lucide-react';

const POSITIONS: Array<{ id: FootballPosition; label: string; desc: string; icon: typeof Trophy }> = [
  { id: 'GK', label: 'Goalkeeper', desc: 'Shot-stopping & box command', icon: Shield },
  { id: 'DEF', label: 'Defender', desc: 'Backline tackles & interceptions', icon: Shield },
  { id: 'MID', label: 'Midfielder', desc: 'Playmaking, tempo & box-to-box', icon: Zap },
  { id: 'ATT', label: 'Attacker', desc: 'Finishing, wing pace & scoring', icon: Target },
];

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [preferredPosition, setPreferredPosition] = useState<FootballPosition | null>(
    (profile?.preferred_position as FootballPosition) || null
  );
  const [secondaryPosition, setSecondaryPosition] = useState<FootballPosition | null>(
    (profile?.secondary_position as FootballPosition) || null
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setPreferredPosition((profile.preferred_position as FootballPosition) || null);
      setSecondaryPosition((profile.secondary_position as FootballPosition) || null);
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handleSelectPrimary = (pos: FootballPosition) => {
    setPreferredPosition(pos);
    if (secondaryPosition === pos) {
      setSecondaryPosition(null);
    }
  };

  const handleSelectSecondary = (pos: FootballPosition | null) => {
    if (pos && pos === preferredPosition) return;
    setSecondaryPosition(pos);
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the user can pick the same file again if desired
    e.target.value = '';

    setIsUploadingAvatar(true);
    setStatusMessage(null);

    try {
      const newUrl = await uploadAvatarImage(file);
      setAvatarUrl(newUrl);
      await refreshProfile();
      setStatusMessage({ type: 'success', message: 'Player avatar updated successfully.' });
    } catch (err: unknown) {
      console.error('Failed to upload avatar:', err);
      setStatusMessage({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to upload profile image.',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!displayName.trim()) {
      setStatusMessage({ type: 'error', message: 'Player display name cannot be blank.' });
      return;
    }

    if (!preferredPosition) {
      setStatusMessage({ type: 'error', message: 'Please select a primary football position.' });
      return;
    }

    if (preferredPosition === secondaryPosition) {
      setStatusMessage({ type: 'error', message: 'Primary and secondary positions cannot be the same.' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          preferred_position: preferredPosition,
          secondary_position: secondaryPosition || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setStatusMessage({ type: 'success', message: 'Football player profile saved successfully.' });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">
          Football Player <span className="text-primary">Profile</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your pitch positions, player moniker, and team badge.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 text-xs ${
            statusMessage.type === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-danger/30 bg-danger/10 text-danger'
          }`}
          role="alert"
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Player Identity Card */}
        <Card className="md:col-span-1 border-border bg-surface shadow-card h-fit">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Player Identity
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5 text-center">
            <div className="relative mx-auto w-24 h-24">
              <Avatar
                src={avatarUrl || undefined}
                fallback={displayName || user?.email || 'P'}
                size="lg"
                className="w-24 h-24 text-2xl font-black border-2 border-primary/30 shadow-md mx-auto"
              />
              {isUploadingAvatar ? (
                <div
                  className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-primary"
                  title="Uploading..."
                >
                  <Loader2 className="h-7 w-7 animate-spin" />
                </div>
              ) : (
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary-hover cursor-pointer transition-colors"
                  title="Change Avatar"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                    disabled={isUploadingAvatar}
                  />
                </label>
              )}
            </div>

            {isUploadingAvatar && (
              <p className="text-[11px] font-semibold text-primary animate-pulse">
                Uploading avatar image...
              </p>
            )}

            <div>
              <h3 className="font-bold text-foreground text-lg">
                {displayName || 'Player'}
              </h3>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {preferredPosition ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary font-mono text-xs font-bold">
                  <Sparkles className="h-3 w-3" />
                  <span>Primary: {preferredPosition}</span>
                </div>
              ) : (
                <StatusBadge status="pending" />
              )}

              {secondaryPosition && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-subtle border border-border text-muted-foreground font-mono text-xs">
                  <span>Sec: {secondaryPosition}</span>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4 text-xs text-muted-foreground text-center">
              <span>Account: </span>
              <span className="font-medium text-foreground">{user?.email}</span>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Positions & Profile Form */}
        <div className="md:col-span-2">
          <Card className="border-border bg-surface shadow-card">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg font-bold">Pitch Positions & Name</CardTitle>
              <CardDescription className="text-xs">
                Squad captains use these positions to generate tactical 5v5/7v7 lineups.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <FormField label="Player Display Name" htmlFor="name" required>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="e.g. Rahul Nair"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </FormField>

                {/* Primary Position Selection */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                    Preferred Primary Position <span className="text-danger">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {POSITIONS.map((pos) => {
                      const isSelected = preferredPosition === pos.id;
                      const Icon = pos.icon;

                      return (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => handleSelectPrimary(pos.id)}
                          className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
                              : 'border-border bg-surface-subtle hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-surface border border-border text-foreground">
                              {pos.id}
                            </span>
                            {isSelected ? (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </div>
                            ) : (
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <span className="text-sm font-bold text-foreground">{pos.label}</span>
                          <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {pos.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Secondary Position Selection */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Secondary Position (Optional)
                    </label>
                    {secondaryPosition && (
                      <button
                        type="button"
                        onClick={() => setSecondaryPosition(null)}
                        className="text-[11px] text-muted-foreground hover:text-foreground underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {POSITIONS.map((pos) => {
                      const isPrimary = preferredPosition === pos.id;
                      const isSelected = secondaryPosition === pos.id;

                      return (
                        <button
                          key={pos.id}
                          type="button"
                          disabled={isPrimary}
                          onClick={() => handleSelectSecondary(isSelected ? null : pos.id)}
                          className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                            isPrimary
                              ? 'opacity-40 border-dashed border-border cursor-not-allowed bg-surface-subtle/50'
                              : isSelected
                              ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                              : 'border-border bg-surface-subtle hover:border-primary/40 text-foreground'
                          }`}
                        >
                          <span className="font-mono text-xs">{pos.id}</span>
                          <span className="text-[10px] text-muted-foreground truncate">{pos.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Secondary position must be distinct from primary.
                  </p>
                </div>

                <div className="flex justify-end pt-2 border-t border-border">
                  <Button
                    type="submit"
                    className="h-11 px-6 font-bold bg-primary text-primary-foreground hover:bg-primary-hover shadow-md"
                    isLoading={isSaving}
                  >
                    Save Player Profile
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
