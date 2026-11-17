import React from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  Database, 
  Layers, 
  GitBranch, 
  CheckCircle2,
  Terminal
} from 'lucide-react';

export function TechHero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pb-24 border-b border-border bg-gradient-to-b from-[#081813] via-surface to-background">
      {/* Ambient background grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_-10%,rgba(183,243,75,0.12),rgba(11,31,25,0))] pointer-events-none" />

      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Breadcrumb / Return button */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors rounded-lg border border-border bg-surface px-3 py-1.5 shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Kalikkanundo</span>
          </Link>
        </div>

        <div className="max-w-4xl space-y-6">
          {/* Engineering Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-primary">
            <Terminal className="h-3.5 w-3.5" />
            <span>Engineering & Architecture Showcase</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground uppercase leading-[1.06]">
            Engineered for <span className="text-primary">Every Game.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
            A comprehensive technical breakdown of Kalikkanundo: our multi-sport modular architecture, real-time WebSocket synchronization, PostgreSQL Row-Level Security (RLS) policies, and invariant-driven state management.
          </p>

          {/* Architecture Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="rounded-xl border border-border bg-surface p-3.5">
              <div className="flex items-center gap-2 text-primary text-xs font-mono font-bold mb-1">
                <Database className="h-4 w-4" />
                <span>PostgreSQL</span>
              </div>
              <span className="text-base font-black text-foreground">Multi-Sport RLS</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Strict database-level auth</p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-3.5">
              <div className="flex items-center gap-2 text-primary text-xs font-mono font-bold mb-1">
                <Zap className="h-4 w-4" />
                <span>Realtime</span>
              </div>
              <span className="text-base font-black text-foreground">WebSocket Sync</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Instant lineup & RSVP updates</p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-3.5">
              <div className="flex items-center gap-2 text-primary text-xs font-mono font-bold mb-1">
                <ShieldCheck className="h-4 w-4" />
                <span>Security</span>
              </div>
              <span className="text-base font-black text-foreground">JWT & Definer RPC</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Zero client-trusted logic</p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-3.5">
              <div className="flex items-center gap-2 text-primary text-xs font-mono font-bold mb-1">
                <Cpu className="h-4 w-4" />
                <span>Type Safety</span>
              </div>
              <span className="text-base font-black text-foreground">100% Strict TS</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">End-to-end type contracts</p>
            </div>
          </div>

          {/* In-page jump navigation */}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider mr-1">
              Jump to:
            </span>
            {[
              { label: 'System Architecture', href: '#architecture' },
              { label: 'Verified Tech Stack', href: '#stack' },
              { label: 'Engineering Patterns', href: '#patterns' },
              { label: 'Security & RLS', href: '#security' },
              { label: 'Product Lifecycle', href: '#lifecycle' },
            ].map((jump) => (
              <a
                key={jump.label}
                href={jump.href}
                className="text-xs font-semibold text-foreground/80 hover:text-primary rounded-lg border border-border bg-surface-subtle px-3 py-1.5 transition-colors"
              >
                {jump.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

