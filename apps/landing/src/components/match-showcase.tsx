import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Users,
  Trophy,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { siteConfig } from '@/config/site';

export function MatchShowcase() {
  return (
    <section className="py-20 lg:py-28 border-t border-border bg-surface/30">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Feature Narrative */}
          <div className="lg:col-span-6 space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>Match Coordination</span>
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground uppercase leading-tight">
              Every Match.{' '}
              <span className="text-primary block mt-1">Perfectally Organized.</span>
            </h2>

            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              No more scrolling through hundreds of chat messages to count heads. Kalikkanundo gives your squad real-time attendance tracking, automatic quorum checks, and clean Team A vs Team B splits across football turfs, cricket grounds, and courts.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Transparent RSVP Deadlines</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Lock attendance ahead of game time so you always know if you have enough players to meet court quorum.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Sport-Aware Team Splits</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Split confirmed players evenly into balanced teams (football positions, cricket batsmen/bowlers, badminton pairs).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Exact Venue & IST Timing</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pin exact turf venues, box arenas, and academies with Indian Standard Time schedules so nobody arrives late.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={`${siteConfig.appUrl}/login?returnUrl=/squads/new`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary-hover transition-all"
              >
                <span>Schedule a Match</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Right Column: Dashboard-style Match Card Preview */}
          <div className="lg:col-span-6">
            <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-6 shadow-modal space-y-6">
              {/* Match Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                      Friendly Derby
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      7v7 Format
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-foreground">
                    Friday Night Turf Clásico
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>United Sports Arena, Kozhikode</span>
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-black font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                    8:30 PM IST
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-1">This Friday</p>
                </div>
              </div>

              {/* Attendance Tracker Bar */}
              <div className="rounded-xl border border-border bg-surface-subtle p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground">Attendance Quorum (14 Players Required)</span>
                  <span className="text-success flex items-center gap-1 font-mono">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>14 Confirmed</span>
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full rounded-full bg-border overflow-hidden flex">
                  <div className="h-full bg-primary" style={{ width: '85%' }} />
                  <div className="h-full bg-warning" style={{ width: '15%' }} />
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>Playing: <strong className="text-primary font-mono">14</strong></span>
                  <span>Maybe: <strong className="text-warning font-mono">2</strong></span>
                  <span>Out: <strong className="text-danger font-mono">1</strong></span>
                </div>
              </div>

              {/* Teams Split: Team A vs Team B */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-surface-subtle p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-primary">Team A (Bibs)</span>
                    <span className="text-[10px] font-mono bg-primary/10 px-1.5 py-0.5 rounded text-primary">
                      7 Players
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Rahul (ATT), Faheem (MID), Shammas (DEF), Riyas (GK) + 3</p>
                </div>

                <div className="rounded-xl border border-border bg-surface-subtle p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-foreground">Team B (Non-Bibs)</span>
                    <span className="text-[10px] font-mono bg-border px-1.5 py-0.5 rounded text-muted-foreground">
                      7 Players
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Razin (ATT), Jithin (MID), Afnan (DEF), Salman (GK) + 3</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1 text-success font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Match Locked & Pitch Ready</span>
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/70">
                  Illustrative product preview
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
