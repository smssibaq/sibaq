'use client';

import React, { useState } from 'react';
import { 
  Layers, 
  Smartphone, 
  Globe, 
  Database, 
  ShieldAlert, 
  Radio, 
  Server, 
  Lock, 
  ArrowDown, 
  CheckCircle2,
  FileCode2,
  Cpu
} from 'lucide-react';

interface LayerItem {
  id: string;
  title: string;
  tag: string;
  description: string;
  details: string[];
}

const LAYERS: LayerItem[] = [
  {
    id: 'clients',
    title: '1. Frontend Client Layer',
    tag: 'Next.js 14 + Vite React SPA',
    description: 'Separation of concerns between high-performance static/SSR landing and interactive, latency-sensitive match coordination application.',
    details: [
      'Next.js 14 App Router: High-performance SSR marketing site, zero client-side layout shift, instant page rendering.',
      'Vite + React 18 SPA: Realtime-rich web application hosting match center, tactile pitch formation board, and cricket scorecard.',
      'Tailwind CSS Design Tokens: Unified dark-forest visual identity (#0B1F19, #B7F34B) shared across platforms.',
    ],
  },
  {
    id: 'state',
    title: '2. State Management & Data Fetching',
    tag: 'TanStack Query + Zustand',
    description: 'Decoupled server caching from local UI interactions, enabling optimistic updates and offline-tolerant match control.',
    details: [
      'TanStack Query: Server state cache, automatic background refetching, query key-based cache invalidation.',
      'Zustand Store: Fast client state for live tactical lineup coordinates, drag-and-drop position slots, and cricket toss selection.',
      'Optimistic Mutations: Instant visual feedback for RSVPs and lineup adjustments before network roundtrips finish.',
    ],
  },
  {
    id: 'gateway',
    title: '3. Transport & Realtime Layer',
    tag: 'PostgREST + Supabase Realtime Channels',
    description: 'Bi-directional WebSocket streaming combined with declarative typed REST endpoints.',
    details: [
      'PostgREST API: Auto-generated RESTful API directly mapped to PostgreSQL schemas with typed query parameters.',
      'Supabase Realtime WebSockets: Subscribed to postgres_changes events on public.game_rsvps and public.game_lineups.',
      'Broadcast & Presence: Instant lineup lock sync across team captain and squad member devices.',
    ],
  },
  {
    id: 'security',
    title: '4. Security & Authentication Perimeter',
    tag: 'Supabase Auth + Row-Level Security (RLS)',
    description: 'Database-enforced security boundaries where unauthorized queries fail at the PostgreSQL kernel level.',
    details: [
      'JWT Authentication: Supabase Auth issue cryptographic tokens containing user UID and claims.',
      'Strict RLS Policies: Every table has explicit SELECT, INSERT, UPDATE, DELETE policies bound to auth.uid().',
      'SECURITY DEFINER RPCs: Sensitive operations (confirming attendance, locking formations) run via audited SQL functions.',
    ],
  },
  {
    id: 'database',
    title: '5. Relational Multi-Sport Schema',
    tag: 'PostgreSQL 15+ Core Tables & Extensions',
    description: 'Polymorphic sports data model pairing shared match metadata with specialized sport-specific tables.',
    details: [
      'Core Schema: public.games, public.squads, public.squad_members, public.profiles.',
      'Cricket Schema: public.cricket_match_details, public.cricket_players, public.cricket_overs.',
      'Lineup & RSVP Schema: public.game_lineups (pitch coords, role markers), public.game_rsvps (status constraints).',
      'Relational Integrity: Cascading deletes, unique indexes (single GK per team), foreign key constraints.',
    ],
  },
];

export function ArchitectureDiagram() {
  const [activeLayer, setActiveLayer] = useState<string>('clients');
  const selected = LAYERS.find((l) => l.id === activeLayer) || LAYERS[0];

  return (
    <section id="architecture" className="py-20 lg:py-28 border-b border-border bg-surface/30 relative">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-widest text-primary mb-3">
            <Layers className="h-4 w-4" />
            <span>System Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground uppercase leading-tight">
            Layered System <span className="text-primary">Topology.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            From the client UI layer to PostgreSQL database kernel enforcement, Kalikkanundo is architected for zero data loss, sub-second coordination, and bulletproof security.
          </p>
        </div>

        {/* Interactive Architecture Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Layer Stack */}
          <div className="lg:col-span-6 space-y-3">
            {LAYERS.map((layer, index) => {
              const isSelected = layer.id === activeLayer;
              return (
                <div key={layer.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveLayer(layer.id)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-md ring-1 ring-primary/40'
                        : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-subtle'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-mono font-bold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                          0{index + 1}
                        </span>
                        <h3 className="text-base font-bold text-foreground">
                          {layer.title}
                        </h3>
                      </div>
                      <span className="text-xs font-mono text-primary/90">
                        {layer.tag}
                      </span>
                    </div>

                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      isSelected ? 'border-primary/40 bg-primary text-primary-foreground' : 'border-border bg-surface-subtle text-muted-foreground'
                    }`}>
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </button>

                  {/* Flow connector down arrow */}
                  {index < LAYERS.length - 1 && (
                    <div className="flex justify-center py-1 text-primary/40">
                      <ArrowDown className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Layer Deep-Dive Inspector */}
          <div className="lg:col-span-6 sticky top-24">
            <div className="rounded-3xl border border-primary/30 bg-surface p-7 sm:p-9 shadow-modal space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <span className="text-xs font-mono text-primary font-bold uppercase tracking-wider block">
                    Architecture Inspector
                  </span>
                  <h3 className="text-2xl font-black text-foreground mt-1">
                    {selected.title}
                  </h3>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-mono font-bold text-primary">
                  {selected.tag}
                </div>
              </div>

              <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-medium">
                {selected.description}
              </p>

              {/* Technical Specifications Checklist */}
              <div className="space-y-3.5 pt-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground block">
                  Implementation Details & Guarantees:
                </span>
                {selected.details.map((detail, idx) => (
                  <div key={idx} className="flex items-start gap-3 rounded-xl border border-border/80 bg-surface-subtle p-3.5">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {detail}
                    </span>
                  </div>
                ))}
              </div>

              {/* Security & Invariant Note */}
              <div className="rounded-xl border border-primary/20 bg-[#0B261D] p-4 text-xs text-primary/90 font-mono">
                <span className="font-bold text-primary block mb-1">Architecture Guarantee:</span>
                Client state is never treated as source of truth for match permissions, lineup validity, or attendance status.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

