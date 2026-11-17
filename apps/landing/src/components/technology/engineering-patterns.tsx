import React from 'react';
import { 
  GitMerge, 
  Workflow, 
  CheckCheck, 
  RefreshCw, 
  Sliders, 
  ShieldCheck, 
  FileCode,
  Sparkles
} from 'lucide-react';

interface PatternItem {
  icon: any;
  title: string;
  tagline: string;
  codeSnippet: string;
  benefits: string[];
}

const PATTERNS: PatternItem[] = [
  {
    icon: GitMerge,
    title: 'Polymorphic Multi-Sport Domain',
    tagline: 'Shared core game record extended by specialized sport schemas',
    codeSnippet: `-- Core polymorphic game record
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_type TEXT NOT NULL CHECK (sport_type IN ('football', 'cricket', 'badminton', 'volleyball')),
  squad_id UUID NOT NULL REFERENCES public.squads(id),
  venue_name TEXT NOT NULL,
  match_date TIMESTAMPTZ NOT NULL,
  organizer_id UUID NOT NULL REFERENCES auth.users(id)
);

-- Cricket specialized extension
CREATE TABLE public.cricket_match_details (
  game_id UUID PRIMARY KEY REFERENCES public.games(id) ON DELETE CASCADE,
  overs_per_side INT NOT NULL DEFAULT 10,
  max_overs_per_bowler INT NOT NULL DEFAULT 2,
  toss_winner_team TEXT,
  toss_decision TEXT CHECK (toss_decision IN ('bat', 'bowl'))
);`,
    benefits: [
      'Eliminates duplicate CRUD endpoints across four different sports.',
      'Allows adding new sports without database migration downtime.',
      'Cascading foreign keys guarantee zero orphaned sport-specific records.',
    ],
  },
  {
    icon: CheckCheck,
    title: 'Strict Invariant Enforcement',
    tagline: 'Rules enforced in TypeScript types, Zustand stores, and SQL constraints',
    codeSnippet: `// Football: Enforcing exactly ONE Goalkeeper per lineup
export function assignPlayerPosition(
  currentLineup: LineupSlot[], 
  playerId: string, 
  targetSlot: Slot
): LineupSlot[] {
  if (targetSlot.role === 'GK') {
    // Demote any existing GK back to outfield/bench
    return currentLineup.map(slot => 
      slot.role === 'GK' && slot.playerId !== playerId 
        ? { ...slot, role: 'SUB' } 
        : slot
    );
  }
  return [...currentLineup, { playerId, role: targetSlot.role }];
}`,
    benefits: [
      'Prevents invalid game states before requests hit the network.',
      'Prevents team confusion (e.g., two goalkeepers on the same pitch).',
      'Cricket bowler quota constraints prevent rule violations automatically.',
    ],
  },
  {
    icon: RefreshCw,
    title: 'Optimistic UI with Realtime Reconciliation',
    tagline: 'Instant local state transition with WebSocket rollback safety',
    codeSnippet: `// Instant RSVP toggle with TanStack Query rollback
const { mutate } = useMutation({
  mutationFn: (newStatus: 'playing' | 'maybe' | 'out') => 
    supabase.from('game_rsvps').upsert({ game_id, user_id, status: newStatus }),
  onMutate: async (newStatus) => {
    await queryClient.cancelQueries(['game_rsvps', game_id]);
    const previous = queryClient.getQueryData(['game_rsvps', game_id]);
    queryClient.setQueryData(['game_rsvps', game_id], (old) => 
      optimisticallyUpdateRsvp(old, user_id, newStatus)
    );
    return { previous };
  },
  onError: (err, newStatus, context) => {
    queryClient.setQueryData(['game_rsvps', game_id], context.previous);
  }
});`,
    benefits: [
      'Zero perceived latency when confirming match attendance.',
      'Full resilience against intermittent pitch-side cellular reception.',
      'Auto-syncs across captain and teammate devices via Phoenix WebSockets.',
    ],
  },
];

export function EngineeringPatterns() {
  return (
    <section id="patterns" className="py-20 lg:py-28 border-b border-border bg-surface/20 relative">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-widest text-primary mb-3">
            <Workflow className="h-4 w-4" />
            <span>Architecture & Code Patterns</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground uppercase leading-tight">
            Designed for <span className="text-primary">Correctness & Scale.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Real software engineering is about edge cases: handling network drops under floodlights, preventing duplicate positions, and isolating domain boundaries.
          </p>
        </div>

        {/* 3 Major Pattern Showcases */}
        <div className="space-y-12">
          {PATTERNS.map((pattern, idx) => {
            const Icon = pattern.icon;
            return (
              <div
                key={pattern.title}
                className="rounded-3xl border border-border bg-surface p-7 sm:p-10 shadow-card"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Context & Benefits */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-mono text-primary font-bold uppercase">
                          Pattern 0{idx + 1}
                        </span>
                        <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                          {pattern.title}
                        </h3>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-foreground/80 font-medium">
                      {pattern.tagline}
                    </p>

                    <div className="space-y-2.5 pt-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground block">
                        Key Architectural Benefits:
                      </span>
                      {pattern.benefits.map((b, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-2.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                          <span className="text-xs text-muted-foreground leading-relaxed">
                            {b}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Code Snippet Card */}
                  <div className="lg:col-span-7">
                    <div className="rounded-2xl border border-primary/20 bg-[#050D0A] p-4 sm:p-5 shadow-inner overflow-hidden">
                      <div className="flex items-center justify-between pb-3 border-b border-[#142D25] mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                          <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                          Production Implementation
                        </span>
                      </div>
                      <pre className="font-mono text-[11px] sm:text-xs text-[#E2E8F0] overflow-x-auto leading-relaxed">
                        <code>{pattern.codeSnippet}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

