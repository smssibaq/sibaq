import React from 'react';
import { Shield, UserCheck, Trophy, ArrowRight } from 'lucide-react';
import { siteConfig } from '@/config/site';

const STEPS = [
  {
    step: '01',
    icon: Shield,
    title: 'Create Your Squad',
    desc: 'Set up a permanent group for your turf friends. Choose your moniker, establish captain permissions, and generate your room code.',
  },
  {
    icon: UserCheck,
    step: '02',
    title: 'Invite & Organize',
    desc: 'Share your join code directly on WhatsApp. Teammates join in seconds, choose their preferred pitch positions, and confirm match availability.',
  },
  {
    icon: Trophy,
    step: '03',
    title: 'Build Your Team',
    desc: 'Choose your starters, test tactical 5v5/7v7 formations on the pitch board, and take the field ready to own the turf.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 border-t border-border relative">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-primary block mb-3">
            Streamlined Coordination
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground uppercase leading-tight">
            From Group Chat to Game Day{' '}
            <span className="text-primary block mt-1">in 3 Steps.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Eliminate confusion, last-minute dropouts, and unbalanced teams before you ever lace up.
          </p>
        </div>

        {/* 3 Step Numbered Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative rounded-2xl border border-border bg-surface p-8 shadow-card flex flex-col justify-between hover:border-primary/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono text-3xl font-black text-primary/80">
                      {item.step}
                    </span>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-subtle border border-border text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">
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

        {/* Action Link */}
        <div className="mt-12 text-center">
          <a
            href={`${siteConfig.appUrl}/login?returnUrl=/squads/new`}
            className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover transition-colors"
          >
            <span>Ready to set up your squad? Get started in 60 seconds</span>
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
