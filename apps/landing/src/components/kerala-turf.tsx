import React from 'react';
import { Share2, Smartphone, Users, Zap, Clock, Shield } from 'lucide-react';

const HIGHLIGHTS = [
  {
    icon: Share2,
    title: 'Instant WhatsApp Sharing',
    desc: 'Generate your squad room code or shareable invite link and drop it straight into your group chat. Friends join with one tap.',
  },
  {
    icon: Users,
    title: 'All Local Formats Supported',
    desc: 'From 5v5/7v7 turf football to 10-over box cricket, badminton doubles, and 6v6 court volleyball, manage any local format effortlessly.',
  },
  {
    icon: Smartphone,
    title: 'Mobile-First for Court & Pitch Side',
    desc: 'Check lineups, batting cards, rotations, and RSVPs right on your phone under turf floodlights without lag or app-store downloads.',
  },
  {
    icon: Clock,
    title: 'Floodlit & Morning Slots',
    desc: 'Schedule 6:00 AM badminton or 10:00 PM turf football in IST. Automated RSVPs ensure you always have a quorum before paying advance booking fees.',
  },
];

export function KeralaTurf() {
  return (
    <section id="why-kalikkanundo" className="py-20 lg:py-28 border-t border-border relative">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-primary block mb-3">
            Local Passion • Modern Tech
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground uppercase leading-tight">
            Made for the Way{' '}
            <span className="text-primary block mt-1">We Play.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            From late-night turf football to weekend box cricket and morning badminton, Kalikkanundo keeps your sports community ready for game day.
          </p>
        </div>

        {/* 4 Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {HIGHLIGHTS.map((h) => {
            const Icon = h.icon;
            return (
              <div
                key={h.title}
                className="rounded-2xl border border-border bg-surface p-8 shadow-card flex items-start gap-5 hover:border-primary/40 transition-all"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-subtle border border-border text-primary">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {h.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {h.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
