import React from 'react';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, Users, Calendar, MapPin, Activity, Flame } from 'lucide-react';
import { siteConfig } from '@/config/site';

export function Hero() {
  return (
    <section id="overview" className="relative overflow-hidden py-12 sm:py-20 lg:py-24">
      {/* Subtle ambient pitch grid glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(183,243,75,0.08),rgba(11,31,25,0))] pointer-events-none" />

      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Hero Copy & Actions */}
          <div className="lg:col-span-6 text-center lg:text-left space-y-6">
            {/* Multi-sport Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-primary shadow-sm">
              <Image
                src="/branding/kalikkanundo-logo.svg"
                alt="Kalikkanundo"
                width={16}
                height={16}
                className="h-4 w-4 object-contain shrink-0"
              />
              <span>Built for Every Game • Football • Cricket • Badminton • Volleyball</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground uppercase leading-[1.08]">
              Your Game. Your Squad.{' '}
              <span className="text-primary block mt-1">Every Sport.</span>
            </h1>

            {/* Value Proposition Callout */}
            <div className="rounded-xl border border-primary/20 bg-surface/80 p-3.5 text-xs sm:text-sm text-foreground/90 font-medium">
              <span className="text-primary font-bold">No more endless WhatsApp messages: </span>
              Organize your squads, lineups, and match attendance across turf football, cricket nets, badminton courts, and volleyball in one dedicated platform.
            </div>

            {/* Supporting Paragraph */}
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
              Create your squad, invite friends via room code, organize matches with real-time RSVPs, and build your tactical lineup without the chaos.
            </p>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <a
                href={`${siteConfig.appUrl}/login?returnUrl=/squads/new`}
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-bold text-primary-foreground shadow-md hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
              >
                <span>Start Your Game</span>
                <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="#sports"
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-xl border border-border bg-surface px-7 text-base font-semibold text-foreground hover:bg-surface-subtle transition-all"
              >
                Explore How It Works
              </a>
            </div>

            {/* Trust Highlights */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-xs font-semibold text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>4 Sports Supported</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Instant WhatsApp Join Code</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Live Realtime Lineup Sync</span>
              </div>
            </div>
          </div>

          {/* Right Column: Sports Dashboard & Multi-Sport Preview */}
          <div className="lg:col-span-6">
            <div className="relative mx-auto max-w-lg rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-modal">
              {/* Header: Squad Identity Card */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-sm shadow-sm">
                    MS
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Malabar Strikers Club</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3 text-primary" />
                      <span>Multi-Sport Squad</span>
                      <span>•</span>
                      <span>Kozhikode, Kerala</span>
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-bold text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span>Active Match Week</span>
                </div>
              </div>

              {/* Multi-Sport Quick Badges */}
              <div className="grid grid-cols-4 gap-2 my-4">
                <div className="rounded-lg border border-primary/40 bg-primary/10 p-2 text-center">
                  <span className="text-[10px] font-bold text-primary block uppercase">Football</span>
                  <span className="text-xs font-bold text-foreground">7v7 Turf</span>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle p-2 text-center">
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase">Cricket</span>
                  <span className="text-xs font-bold text-foreground">12 Over Box</span>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle p-2 text-center">
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase">Badminton</span>
                  <span className="text-xs font-bold text-foreground">Doubles</span>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle p-2 text-center">
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase">Volleyball</span>
                  <span className="text-xs font-bold text-foreground">6v6 Court</span>
                </div>
              </div>

              {/* Realistic Pitch / Ground Preview */}
              <div className="my-4 relative aspect-[16/10] w-full rounded-xl border border-primary/30 bg-[#0B261D] p-3 shadow-inner overflow-hidden flex flex-col justify-between">
                {/* Field Markings */}
                <div className="absolute inset-2 border border-white/20 rounded-md pointer-events-none" />
                <div className="absolute top-1/2 left-2 right-2 h-px bg-white/20 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 pointer-events-none" />
                <div className="absolute top-2 left-1/3 right-1/3 h-10 border-b border-x border-white/20 rounded-b pointer-events-none" />
                <div className="absolute bottom-2 left-1/3 right-1/3 h-10 border-t border-x border-white/20 rounded-t pointer-events-none" />

                {/* Pitch Formation: Attacker */}
                <div className="flex justify-center pt-1 z-10">
                  <div className="flex flex-col items-center">
                    <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shadow-lg ring-2 ring-primary/40">
                      ATT
                    </div>
                    <span className="text-[10px] font-bold text-foreground mt-0.5 bg-surface/90 px-1.5 py-0.5 rounded border border-border">
                      Rahul
                    </span>
                  </div>
                </div>

                {/* Pitch Formation: Midfield */}
                <div className="flex justify-around px-6 z-10">
                  <div className="flex flex-col items-center">
                    <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shadow-lg ring-2 ring-primary/40">
                      MID
                    </div>
                    <span className="text-[10px] font-bold text-foreground mt-0.5 bg-surface/90 px-1.5 py-0.5 rounded border border-border">
                      Faheem
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shadow-lg ring-2 ring-primary/40">
                      MID
                    </div>
                    <span className="text-[10px] font-bold text-foreground mt-0.5 bg-surface/90 px-1.5 py-0.5 rounded border border-border">
                      Jithin
                    </span>
                  </div>
                </div>

                {/* Pitch Formation: Defenders */}
                <div className="flex justify-around px-8 z-10">
                  <div className="flex flex-col items-center">
                    <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shadow-lg ring-2 ring-primary/40">
                      DEF
                    </div>
                    <span className="text-[10px] font-bold text-foreground mt-0.5 bg-surface/90 px-1.5 py-0.5 rounded border border-border">
                      Afnan
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shadow-lg ring-2 ring-primary/40">
                      DEF
                    </div>
                    <span className="text-[10px] font-bold text-foreground mt-0.5 bg-surface/90 px-1.5 py-0.5 rounded border border-border">
                      Shammas
                    </span>
                  </div>
                </div>

                {/* Pitch Formation: Goalkeeper */}
                <div className="flex justify-center pb-1 z-10">
                  <div className="flex flex-col items-center">
                    <div className="h-7 w-7 rounded-full bg-warning text-black font-black text-xs flex items-center justify-center shadow-lg ring-2 ring-warning/40">
                      GK
                    </div>
                    <span className="text-[10px] font-bold text-foreground mt-0.5 bg-surface/90 px-1.5 py-0.5 rounded border border-border">
                      Riyas
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Mini Card: Upcoming Match Status */}
              <div className="rounded-xl border border-border bg-surface-subtle p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>Friday 8:30 PM • 7v7 Turf Derby</span>
                  </span>
                  <span className="text-[10px] font-bold bg-success/20 text-success px-2 py-0.5 rounded-full border border-success/30">
                    14/14 Confirmed
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                    <MapPin className="h-3 w-3 text-primary shrink-0" />
                    <span>Decathlon Arena, Kalamassery</span>
                  </span>
                  <span className="text-[11px] font-semibold text-primary">Team A vs Team B</span>
                </div>
              </div>

              {/* Discreet Illustrative Content Label */}
              <p className="mt-3 text-[11px] text-muted-foreground/70 text-center font-mono">
                Multi-sport live coordinator preview
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
