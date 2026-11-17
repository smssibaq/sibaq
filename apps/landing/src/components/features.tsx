import React from 'react';
import {
  Shield,
  UserPlus,
  Calendar,
  LayoutGrid,
  Users,
  Trophy,
  Sparkles,
} from 'lucide-react';

const FEATURE_ITEMS = [
  {
    icon: Shield,
    title: 'Create Squads',
    desc: 'Build a permanent football group with your friends and assign squad roles.',
  },
  {
    icon: UserPlus,
    title: 'Invite Players',
    desc: 'Invite teammates using shareable links and private 16-character room codes.',
  },
  {
    icon: Calendar,
    title: 'Manage Matches',
    desc: 'Plan friendly games, practice sessions, and upcoming fixtures at your favorite turf.',
  },
  {
    icon: LayoutGrid,
    title: 'Build Formations',
    desc: 'Create your starting lineup with a visual football pitch supporting 5v5 to 7v7.',
  },
  {
    icon: Users,
    title: 'Track Availability',
    desc: 'Know who is playing before match day with transparent playing, maybe, and out RSVPs.',
  },
  {
    icon: Trophy,
    title: 'Manage Your Team',
    desc: 'Assign preferred positions and organize Team A vs Team B effortlessly.',
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-28 border-t border-border relative">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary mb-3">
            <Sparkles className="h-4 w-4" />
            <span>Core Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground uppercase leading-tight">
            Everything Your Turf Squad Needs.{' '}
            <span className="text-primary block mt-1">One Platform.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            No more scattered messages, confusing lineups, or last-minute team management.
          </p>
        </div>

        {/* 6-Card Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {FEATURE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="group relative rounded-2xl border border-border bg-surface p-7 shadow-card hover:border-primary/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-surface-subtle text-primary border border-border mb-5 group-hover:scale-105 group-hover:bg-primary/10 transition-all">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
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
