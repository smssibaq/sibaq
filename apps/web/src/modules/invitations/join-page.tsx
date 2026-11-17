import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  joinByCodeSchema,
  normalizeRoomCode,
  ROOM_CODE_DEFAULT_LENGTH,
  ROOM_CODE_MAX_LENGTH,
  type JoinByCodeFormData,
} from './schema';
import { squadApi } from '../squads/api';
import { supabase } from '@/infrastructure/supabase/client';
import { useAuth } from '../auth/auth-provider';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import {
  UserPlus,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Shield,
  Clock,
  LogIn,
} from 'lucide-react';

export function JoinPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [joinedState, setJoinedState] = useState<{
    squadId: string;
    squadName?: string;
    status: 'active' | 'pending' | 'already_member';
  } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<JoinByCodeFormData>({
    resolver: zodResolver(joinByCodeSchema),
    defaultValues: {
      code: '',
    },
  });

  const enteredCode = watch('code') || '';

  // Handle typing: auto-uppercase and strip illegal characters
  const handleCodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = normalizeRoomCode(raw).replace(/[^A-Z0-9]/g, '');
    setValue('code', sanitized, { shouldValidate: true });
    if (serverError) setServerError(null);
  };

  // Handle paste button or Ctrl+V
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const sanitized = normalizeRoomCode(text).replace(/[^A-Z0-9]/g, '');
      setValue('code', sanitized, { shouldValidate: true });
      if (serverError) setServerError(null);
    } catch {
      // If clipboard permission is denied, focus input so user can Ctrl+V
      const inputEl = document.getElementById('code');
      inputEl?.focus();
    }
  };

  const handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const sanitized = normalizeRoomCode(pastedText).replace(/[^A-Z0-9]/g, '');
    setValue('code', sanitized, { shouldValidate: true });
    if (serverError) setServerError(null);
  };

  const onSubmit = async (data: JoinByCodeFormData) => {
    if (!user) {
      window.location.href = `/login?returnUrl=/join`;
      return;
    }

    const cleanCode = normalizeRoomCode(data.code);
    setIsSubmitting(true);
    setServerError(null);
    setJoinedState(null);

    try {
      // 1. Execute verified join_squad RPC with full 16-character code
      const squadId = await squadApi.joinSquadByCode(cleanCode);

      // 2. Fetch squad details & membership status
      let squadName = 'Squad';
      let memberStatus: 'active' | 'pending' = 'active';

      try {
        const [squadRes, memberRes] = await Promise.all([
          supabase.from('squads').select('name').eq('id', squadId).maybeSingle(),
          supabase
            .from('squad_members')
            .select('status')
            .eq('squad_id', squadId)
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);

        if (squadRes.data?.name) {
          squadName = squadRes.data.name;
        }
        if (memberRes.data?.status === 'pending') {
          memberStatus = 'pending';
        }
      } catch {
        // Fallback if detail query has latency
      }

      setJoinedState({
        squadId,
        squadName,
        status: memberStatus,
      });

      // 3. For active members, redirect to the squad page after 1.5s
      if (memberStatus === 'active') {
        setTimeout(() => {
          window.location.href = `/squads/${squadId}`;
        }, 1500);
      }
    } catch (err: unknown) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : '';

      // Detailed domain error classification
      if (msg.includes('not found') || msg.includes('P0002') || msg.includes('invalid')) {
        setServerError(
          `No squad found with room code "${cleanCode}". Please verify the code with your squad captain.`
        );
      } else if (msg.includes('already a member') || msg.includes('23505') || msg.includes('duplicate')) {
        // Find squad ID to give direct navigation
        try {
          const { data: squadMatch } = await supabase
            .from('squads')
            .select('id, name')
            .eq('join_code', cleanCode)
            .maybeSingle();

          if (squadMatch) {
            setJoinedState({
              squadId: squadMatch.id,
              squadName: squadMatch.name,
              status: 'already_member',
            });
            return;
          }
        } catch {
          // Fallback to error message
        }

        setServerError(
          'You are already a member of this squad. Check your dashboard to view your squad.'
        );
      } else {
        setServerError(msg || 'Failed to join squad. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Join a Squad"
        description="Enter the squad room code shared by your captain to join the roster."
        badge="Squad Join"
      />

      <div className="max-w-md mx-auto">
        <Card className="border-border bg-surface shadow-modal">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Room Code</CardTitle>
                <CardDescription>
                  Enter the code provided by your squad captain
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Unauthenticated State Callout */}
            {!isAuthLoading && !user && (
              <div className="mb-6 rounded-lg border border-warning/30 bg-warning/5 p-4 text-xs text-foreground space-y-2">
                <div className="flex items-center gap-2 font-semibold text-warning">
                  <LogIn className="h-4 w-4" />
                  <span>Authentication Required</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  You must be signed in to join a squad. Sign in first to link your membership.
                </p>
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => (window.location.href = `/login?returnUrl=/join`)}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  <span>Sign In to Continue</span>
                </Button>
              </div>
            )}

            {/* Error Banner */}
            {serverError && (
              <div
                className="mb-6 flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger animate-in fade-in"
                role="alert"
              >
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span className="leading-snug">{serverError}</span>
              </div>
            )}

            {/* Success State: Active Membership */}
            {joinedState?.status === 'active' && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success animate-in fade-in">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Successfully joined {joinedState.squadName}!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Redirecting to squad hub in a moment...
                  </p>
                </div>
              </div>
            )}

            {/* Info State: Pending Approval */}
            {joinedState?.status === 'pending' && (
              <div className="mb-6 space-y-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning animate-in fade-in">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Join Request Submitted!</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Your membership in <strong>{joinedState.squadName}</strong> is pending approval from the squad captain.
                      You will gain full match access once approved.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => (window.location.href = `/squads/${joinedState.squadId}`)}
                  >
                    <span>View Squad Overview</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Notice State: Already a Member */}
            {joinedState?.status === 'already_member' && (
              <div className="mb-6 space-y-3 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-foreground animate-in fade-in">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 shrink-0 mt-0.5 text-primary" />
                  <div>
                    <p className="font-bold text-foreground">Already a Squad Member</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      You are already on the roster for <strong>{joinedState.squadName}</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={() => (window.location.href = `/squads/${joinedState.squadId}`)}
                  >
                    <span>Open Squad Hub</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Room Code Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                label="Squad Room Code"
                htmlFor="code"
                error={errors.code?.message}
                required
              >
                <div className="relative">
                  <Input
                    id="code"
                    maxLength={ROOM_CODE_MAX_LENGTH}
                    placeholder="e.g. 7A3F8B1C9E2D4F0A"
                    className="text-center font-mono text-lg sm:text-xl tracking-wider uppercase font-bold pr-11"
                    disabled={isSubmitting || joinedState?.status === 'active'}
                    {...register('code')}
                    onChange={handleCodeInputChange}
                    onPaste={handleInputPaste}
                  />
                  <button
                    type="button"
                    title="Paste from clipboard"
                    onClick={handlePasteFromClipboard}
                    disabled={isSubmitting || joinedState?.status === 'active'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Clipboard className="h-4 w-4" />
                  </button>
                </div>

                {/* Character Counter & Helper */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5 px-0.5">
                  <span>Squad room code</span>
                  <span className={`font-mono font-medium ${enteredCode.length === ROOM_CODE_DEFAULT_LENGTH ? 'text-primary font-bold' : ''}`}>
                    {enteredCode.length} / {ROOM_CODE_DEFAULT_LENGTH} chars
                  </span>
                </div>
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => (window.location.href = '/dashboard')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={isSubmitting || enteredCode.length === 0 || joinedState?.status === 'active'}
                >
                  <span>Join Squad</span>
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
