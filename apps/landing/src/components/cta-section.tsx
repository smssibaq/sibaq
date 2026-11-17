import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { BrandLogo } from '@/components/brand-logo';

export function CtaSection() {
  return (
    <section className="py-20 lg:py-28 border-t border-border relative overflow-hidden">
      {/* Ambient Radial Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(183,243,75,0.08),rgba(11,31,25,0))] pointer-events-none" />

      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-b from-surface to-surface-subtle p-10 sm:p-16 lg:p-20 text-center shadow-modal relative">
          <div className="flex justify-center mb-6">
            <BrandLogo size="lg" showName={false} />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground uppercase leading-tight max-w-2xl mx-auto">
            Your Next Match{' '}
            <span className="text-primary block mt-1">Starts Here.</span>
          </h2>

          <p className="mt-4 max-w-xl mx-auto text-muted-foreground text-sm sm:text-base leading-relaxed">
            Bring your squad together across Football, Cricket, Badminton, and Volleyball. Organize your match, set your lineup, and take control of game day.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={`${siteConfig.appUrl}/login?returnUrl=/squads/new`}
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-9 text-base font-bold text-primary-foreground shadow-md hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
            >
              <span>Get Started for Free</span>
              <ArrowRight className="h-5 w-5" />
            </a>
            <a
              href="#features"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-xl border border-border bg-surface px-8 text-base font-semibold text-foreground hover:bg-surface-subtle transition-all"
            >
              Explore Features
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
