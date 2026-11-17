import { useState } from 'react';
import { invitationApi } from './api';
import { useAuth } from '../auth/auth-provider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, ArrowRight, LogIn, Clock, Users } from 'lucide-react';
import { BrandLogo } from '@/components/common/brand-logo';

export function InvitePage() {
  const pathParts = window.location.pathname.split('/');
  const token = pathParts[2] || '';
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinedSquadId, setJoinedSquadId] = useState<string | null>(null);
  const [isAlreadyMember, setIsAlreadyMember] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  const handleAcceptInvite = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    setIsAlreadyMember(false);
    setIsPendingApproval(false);

    try {
      const squadId = await invitationApi.joinByInvite(token);
      setJoinedSquadId(squadId);
      setTimeout(() => {
        window.location.href = `/squads/${squadId}`;
      }, 1500);
    } catch (err: unknown) {
      setIsLoading(false);
      const errMsg = err instanceof Error ? err.message : String(err);

      if (errMsg.toLowerCase().includes('already') || errMsg.includes('23505')) {
        setIsAlreadyMember(true);
      } else if (errMsg.toLowerCase().includes('pending') || errMsg.includes('approval')) {
        setIsPendingApproval(true);
      } else if (errMsg.toLowerCase().includes('expired') || errMsg.includes('P0001')) {
        setError('This invitation link has expired or been revoked by the squad captain.');
      } else {
        setError(errMsg || 'Invalid or expired invitation link. Please check with your squad captain.');
      }
    }
  };

  return (
    <div className="flex min-h-[460px] items-center justify-center py-8">
      <Card className="w-full max-w-md border-border bg-surface p-6 sm:p-8 shadow-modal text-center">
        <CardHeader className="space-y-3">
          <div className="flex justify-center mb-1">
            <BrandLogo size="lg" showName={false} />
          </div>
          <div>
            <CardTitle className="text-2xl font-black text-foreground">
              Squad Invitation
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              You have been invited to join a football squad on Kalikkanundo.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          {/* Unauthenticated State */}
          {!user ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground text-left leading-relaxed">
                <p className="font-bold text-foreground mb-1">Authentication Required</p>
                To accept this invitation, please sign in to your Kalikkanundo account. You will automatically return here.
              </div>
              <Button
                className="w-full h-12 font-bold bg-primary text-primary-foreground hover:bg-primary-hover shadow-md"
                onClick={() => (window.location.href = `/login?returnUrl=/invite/${token}`)}
              >
                <LogIn className="h-4 w-4 mr-2" />
                <span>Sign In to Join Squad</span>
              </Button>
            </div>
          ) : (
            <>
              {/* Error Banner */}
              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-xs text-danger text-left">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Already a Member Banner */}
              {isAlreadyMember && (
                <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4 text-xs text-foreground text-left">
                  <Users className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <div>
                    <p className="font-bold text-foreground">Already a Squad Member</p>
                    <p className="text-muted-foreground mt-0.5">
                      You are already registered in this squad roster.
                    </p>
                  </div>
                </div>
              )}

              {/* Pending Approval Banner */}
              {isPendingApproval && (
                <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-xs text-warning text-left">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Request Pending Approval</p>
                    <p className="opacity-90 mt-0.5">
                      Your join request has been submitted to the squad captain for review.
                    </p>
                  </div>
                </div>
              )}

              {/* Success Banner */}
              {joinedSquadId && (
                <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-xs text-success text-left">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Invitation Accepted!</p>
                    <p className="opacity-90 mt-0.5">
                      Welcome to the squad! Redirecting to your squad hub...
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {!joinedSquadId && !isAlreadyMember ? (
                  <Button
                    className="w-full h-12 font-bold bg-primary text-primary-foreground hover:bg-primary-hover shadow-md"
                    onClick={handleAcceptInvite}
                    isLoading={isLoading}
                    disabled={!token || isLoading}
                  >
                    <span>Accept & Join Squad</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    className="w-full h-12 font-bold bg-primary text-primary-foreground hover:bg-primary-hover"
                    onClick={() => (window.location.href = joinedSquadId ? `/squads/${joinedSquadId}` : '/dashboard')}
                  >
                    <span>Open Squad Hub</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => (window.location.href = '/dashboard')}
                >
                  Back to Dashboard
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
