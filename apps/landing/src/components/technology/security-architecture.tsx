import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  Terminal,
  EyeOff
} from 'lucide-react';

interface SecurityRule {
  target: string;
  policy: string;
  type: string;
  rationale: string;
}

const AUDITED_POLICIES: SecurityRule[] = [
  {
    target: 'public.game_rsvps',
    policy: 'auth.uid() = user_id',
    type: 'INSERT / UPDATE',
    rationale: 'Players can only RSVP or alter attendance for their own authenticated user ID. Impersonating other players is blocked at PostgreSQL engine level.',
  },
  {
    target: 'public.game_lineups',
    policy: 'is_squad_organizer(game_id, auth.uid())',
    type: 'INSERT / UPDATE / DELETE',
    rationale: 'Only designated squad organizers and team captains have write access to match formations and starting lineups.',
  },
  {
    target: 'public.games',
    policy: 'is_squad_member(squad_id, auth.uid())',
    type: 'SELECT',
    rationale: 'Squad games and private room fixtures are completely invisible to external unauthenticated users and players from other squads.',
  },
  {
    target: 'public.cricket_match_details',
    policy: 'is_squad_organizer(game_id, auth.uid())',
    type: 'UPDATE',
    rationale: 'Overs configuration, toss outcome, and batting orders are locked to team organizers, preventing mid-match tampering.',
  },
];

export function SecurityArchitecture() {
  return (
    <section id="security" className="py-20 lg:py-28 border-b border-border bg-surface/30 relative">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-widest text-primary mb-3">
            <Lock className="h-4 w-4" />
            <span>Security & Data Governance</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground uppercase leading-tight">
            Kernel-Level <span className="text-primary">Row Level Security.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Security is not an afterthought in Kalikkanundo. We do not trust client-side validation for access control; permissions are cryptographically verified inside PostgreSQL.
          </p>
        </div>

        {/* 4 Pillars of Kalikkanundo Security */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-card space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">PostgreSQL RLS</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every table has strict Row Level Security enabled. Queries without matching auth.uid() return empty sets or fail.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-card space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">JWT Session Integrity</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              User identity is cryptographically signed by GoTrue and verified in each database transaction via Postgres claims.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-card space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">SECURITY DEFINER</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Multi-table joins and room code redemptions run through audited SQL functions with strict parameter typing.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-card space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary">
              <EyeOff className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">Zero Secret Leaks</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Service role keys and server credentials are never packaged into client bundles. Only anon-scoped keys are exposed.
            </p>
          </div>
        </div>

        {/* Audited RLS Policy Matrix */}
        <div className="rounded-3xl border border-border bg-surface p-6 sm:p-10 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                Audited Row-Level Security Matrix
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Verified against production migration schemas
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3.5 py-1 text-xs font-mono font-bold text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span>100% Tables Protected</span>
            </div>
          </div>

          <div className="divide-y divide-border/60">
            {AUDITED_POLICIES.map((policy, idx) => (
              <div key={idx} className="py-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-3">
                  <span className="font-mono text-xs font-bold text-primary block">
                    {policy.target}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">
                    {policy.type}
                  </span>
                </div>
                <div className="lg:col-span-4">
                  <code className="text-xs font-mono bg-[#050D0A] px-2.5 py-1 rounded border border-primary/20 text-[#E2E8F0] block truncate">
                    {policy.policy}
                  </code>
                </div>
                <div className="lg:col-span-5">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {policy.rationale}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

