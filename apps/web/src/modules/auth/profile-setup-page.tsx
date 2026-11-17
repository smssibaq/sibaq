import { useState, useEffect } from 'react';
import { useAuth, sanitizeReturnUrl } from './auth-provider';
import { supabase } from '../../lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { FormField } from '../../components/ui/form-field';
import type { FootballPosition } from '../../types/database.types';
import { Trophy, Shield, Zap, Target, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { BrandLogo } from '../../components/common/brand-logo';

const POSITIONS: Array<{ id: FootballPosition; label: string; desc: string; icon: typeof Trophy }> = [
  { id: 'GK', label: 'Goalkeeper', desc: 'Shot-stopping & box command', icon: Shield },
  { id: 'DEF', label: 'Defender', desc: 'Backline tackles & interceptions', icon: Shield },
  { id: 'MID', label: 'Midfielder', desc: 'Playmaking, tempo & box-to-box', icon: Zap },
  { id: 'ATT', label: 'Attacker', desc: 'Finishing, wing pace & scoring', icon: Target },
];

export function ProfileSetupPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [preferredPosition, setPreferredPosition] = useState<FootballPosition | null>(null);
  const [secondaryPosition, setSecondaryPosition] = useState<FootballPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const returnUrl = sanitizeReturnUrl(searchParams.get('returnUrl') || '/dashboard');

  useEffect(() => {
    if (profile) {
      if (profile.display_name) {
        setDisplayName(profile.display_name);
      } else if (user?.email) {
        setDisplayName(user.email.split('@')[0]);
      }
      if (profile.preferred_position) {
        setPreferredPosition(profile.preferred_position as FootballPosition);
      }
      if (profile.secondary_position) {
        setSecondaryPosition(profile.secondary_position as FootballPosition);
      }
    }
  }, [profile, user]);

  const handleSelectPrimary = (pos: FootballPosition) => {
    setPreferredPosition(pos);
    // If secondary was previously the same as the new primary, reset secondary
    if (secondaryPosition === pos) {
      setSecondaryPosition(null);
    }
  };

  const handleSelectSecondary = (pos: FootballPosition | null) => {
    if (pos && pos === preferredPosition) {
      return; // Prevent selecting the same
    }
    setSecondaryPosition(pos);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!displayName.trim()) {
      setErrorMessage('Please enter your player display name.');
      return;
    }

    if (!preferredPosition) {
      setErrorMessage('Please select your primary preferred pitch position.');
      return;
    }

    if (preferredPosition === secondaryPosition) {
      setErrorMessage('Primary and secondary positions cannot be the same.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          preferred_position: preferredPosition,
          secondary_position: secondaryPosition || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      window.location.href = returnUrl;
    } catch (err: unknown) {
      setIsLoading(false);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to save player profile. Please try again.'
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-3 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-xl space-y-4 sm:space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-1">
            <BrandLogo size="lg" showName={false} />
          </div>
          <h2 className="mt-3 sm:mt-4 text-xl sm:text-2xl font-black tracking-tight text-foreground uppercase">
            Complete Your <span className="text-primary">Player Profile</span>
          </h2>
          <p className="mt-1.5 text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Choose your preferred pitch positions so Kerala turf captains can place you accurately in 5v5/7v7 lineups.
          </p>
        </div>

        <Card className="border-border bg-surface shadow-modal">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold">Player Details</CardTitle>
            <CardDescription className="text-xs">
              Primary position is required. Secondary position is optional.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {errorMessage && (
              <div
                className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-xs text-danger"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Display Name */}
              <FormField label="Player Display Name" htmlFor="displayName" required>
                <Input
                  id="displayName"
                  placeholder="e.g. Rahul Nair, Jithin K"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  minLength={2}
                  maxLength={50}
                  required
                />
              </FormField>

              {/* Primary Preferred Position */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Primary Position <span className="text-danger">*</span>
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

              {/* Secondary Position (Optional) */}
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
                  Cannot be identical to your primary position.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary-hover shadow-md"
                  isLoading={isLoading}
                  disabled={!preferredPosition || !displayName.trim()}
                >
                  <span>Save Profile & Enter Kalikkanundo</span>
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
