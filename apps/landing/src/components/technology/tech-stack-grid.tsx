import React from 'react';
import { 
  Code2, 
  Database, 
  Layers, 
  Lock, 
  Sparkles, 
  Radio, 
  Cpu, 
  CheckCircle2,
  Box
} from 'lucide-react';

interface TechItem {
  category: string;
  name: string;
  version: string;
  role: string;
  whyChosen: string;
}

const TECH_STACK: TechItem[] = [
  {
    category: 'Frontend & Architecture',
    name: 'Next.js 14',
    version: '14.2+',
    role: 'Marketing Showcase & SSR Foundation',
    whyChosen: 'Delivers static site generation, fast server-rendered metadata, and zero Cumulative Layout Shift (CLS) for presentation.',
  },
  {
    category: 'Frontend & Architecture',
    name: 'React 18 & TypeScript',
    version: 'React 18.3 • TS 5.4+',
    role: 'Core UI Library & Strict Type System',
    whyChosen: 'Enforces type safety across sport data models, component props, and database payloads with 100% strict mode compliance.',
  },
  {
    category: 'Styling & Design System',
    name: 'Tailwind CSS',
    version: '3.4+',
    role: 'Design Tokens & Responsive Utility Engine',
    whyChosen: 'Standardized dark-forest color tokens (#0B1F19, #B7F34B), responsive layouts, and zero-runtime CSS bundle footprint.',
  },
  {
    category: 'State & Networking',
    name: 'TanStack Query',
    version: 'v5',
    role: 'Server State Management & Caching',
    whyChosen: 'Provides declarative query keys, background synchronization, stale-while-revalidate caching, and optimistic mutations.',
  },
  {
    category: 'State & Networking',
    name: 'Zustand',
    version: 'v4',
    role: 'Interactive UI & Board State Store',
    whyChosen: 'Lightweight, hook-based store for drag-and-drop formation coordinates, batting card reordering, and instant toss selection.',
  },
  {
    category: 'Backend & Persistence',
    name: 'Supabase PostgreSQL',
    version: 'PG 15+',
    role: 'Relational Database & Business Logic Kernel',
    whyChosen: 'ACID compliance, polymorphic sport tables, strict relational constraints, foreign keys, and performant SQL functions.',
  },
  {
    category: 'Identity & Auth',
    name: 'Supabase Auth',
    version: 'GoTrue JWT',
    role: 'Authentication & Session Token Issuer',
    whyChosen: 'Cryptographically signed JWTs with sub claims directly integrated into PostgreSQL auth.uid() execution context.',
  },
  {
    category: 'Live Synchronization',
    name: 'Supabase Realtime',
    version: 'Phoenix WebSockets',
    role: 'Live Postgres Change Streaming',
    whyChosen: 'Broadcasts RSVP changes, match locks, and tactical formation updates across squad members without polling.',
  },
];

export function TechStackGrid() {
  return (
    <section id="stack" className="py-20 lg:py-28 border-b border-border relative">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-widest text-primary mb-3">
            <Cpu className="h-4 w-4" />
            <span>Verified Technology Stack</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground uppercase leading-tight">
            Pragmatic Engineering.{' '}
            <span className="text-primary block mt-1">Zero Superfluous Dependencies.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Every technology choice was made to maximize reliability under real-world sports conditions: low latency, offline resistance, and instant mobile load.
          </p>
        </div>

        {/* 8-Card Stack Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TECH_STACK.map((tech) => (
            <div
              key={tech.name}
              className="rounded-2xl border border-border bg-surface p-6 shadow-card hover:border-primary/50 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                    {tech.category}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {tech.version}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {tech.name}
                </h3>
                <p className="text-xs font-semibold text-primary/90 mb-3">
                  {tech.role}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tech.whyChosen}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-border/60 flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Audited in Production</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

