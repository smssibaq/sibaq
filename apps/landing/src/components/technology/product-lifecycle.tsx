import React from 'react';
import { 
  GitCommit, 
  MessageCircle, 
  CheckCircle, 
  Layout, 
  Trophy, 
  Archive, 
  ArrowRight,
  Sparkles,
  Clock
} from 'lucide-react';

const LIFECYCLE_STAGES = [
  {
    phase: 'Phase 01',
    icon: MessageCircle,
    title: 'Squad Creation & WhatsApp Link Generation',
    desc: 'The organizer initializes a permanent squad for Football, Cricket, Badminton, or Volleyball. The system provisions a cryptographic 16-character room code and generates a one-tap WhatsApp shareable link.',
    techUnderhood: 'Next.js App Router API • Nanoid Room Code Generation • Postgres public.squads insertion',
  },
  {
    phase: 'Phase 02',
    icon: GitCommit,
    title: 'Frictionless Teammate Onboarding',
    desc: 'Teammates click the WhatsApp link, authenticate with Google OAuth or Email OTP in seconds, and join the squad roster. No native app-store installation or mandatory profile setup delays.',
    techUnderhood: 'Supabase Auth GoTrue JWT • SECURITY DEFINER redeem_room_code() function • public.squad_members',
  },
  {
    phase: 'Phase 03',
    icon: Clock,
    title: 'Real-Time RSVP & Quorum Countdown',
    desc: 'The organizer posts an upcoming match slot with IST time and venue. Teammates submit their availability (Playing / Maybe / Out). When confirmed attendees hit the sport quorum (e.g. 14 for 7v7, 16 for Cricket), the roster locks.',
    techUnderhood: 'Phoenix WebSockets postgres_changes • Optimistic TanStack Query mutations • public.game_rsvps',
  },
  {
    phase: 'Phase 04',
    icon: Layout,
    title: 'Tactical Lineup & Team Assignment',
    desc: 'Organizers open the sport-specific board: drag-and-drop football pitch with single-GK constraint, cricket batting orders with over quotas, badminton doubles pairing, or volleyball rotation matrices.',
    techUnderhood: 'Zustand Store coordinates • Realtime Broadcast Channel • public.game_lineups & public.cricket_match_details',
  },
  {
    phase: 'Phase 05',
    icon: Trophy,
    title: 'Game Day Derby Coordination',
    desc: 'Pitch-side and court-side under floodlights: players view real-time lineups, check their bib colors (Team A vs Team B), monitor cricket toss results, and track live game progression.',
    techUnderhood: 'Mobile-first responsive CSS • Zero CLS UI • Sub-100ms state reconciliation',
  },
  {
    phase: 'Phase 06',
    icon: Archive,
    title: 'Match Finalization & Historical Record',
    desc: 'Once the final whistle blows or last over is bowled, the organizer finalizes the match. Scores and player attendance are recorded into permanent squad history.',
    techUnderhood: 'Postgres transactional finalization • Historical query indexing • Read-only archival status',
  },
];

export function ProductLifecycle() {
  return (
    <section id="lifecycle" className="py-20 lg:py-28 border-b border-border bg-surface/10 relative">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-widest text-primary mb-3">
            <Sparkles className="h-4 w-4" />
            <span>End-to-End User Experience</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground uppercase leading-tight">
            The Multi-Sport <span className="text-primary">Product Lifecycle.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            How Kalikkanundo seamlessly bridges the messy reality of Kerala casual sports with rigorous software state machines.
          </p>
        </div>

        {/* 6-Stage Timeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {LIFECYCLE_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.phase}
                className="rounded-3xl border border-border bg-surface p-7 shadow-card flex flex-col justify-between hover:border-primary/40 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-xs font-mono font-black text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                      {stage.phase}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-subtle border border-border text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {stage.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
                    {stage.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-border/60">
                  <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground block mb-1">
                    Under the Hood:
                  </span>
                  <code className="text-[11px] font-mono text-primary/90 block leading-tight">
                    {stage.techUnderhood}
                  </code>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

