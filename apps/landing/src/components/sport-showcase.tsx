'use client';

import React, { useState } from 'react';
import { 
  Trophy, 
  Users, 
  Clock, 
  MapPin, 
  Shield, 
  ArrowRight, 
  Sparkles,
  CheckCircle2,
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';
import { siteConfig } from '@/config/site';

type SportKey = 'football' | 'cricket' | 'badminton' | 'volleyball';

interface SportData {
  id: SportKey;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  formats: string[];
  keyFeatures: string[];
  sampleFixture: {
    title: string;
    format: string;
    time: string;
    venue: string;
    confirmed: string;
    details: string;
  };
}

const SPORTS: Record<SportKey, SportData> = {
  football: {
    id: 'football',
    name: 'Football',
    badge: 'Turf & 7s',
    tagline: 'Tactical pitch formations with strict role enforcement',
    description: 'Designed specifically for Kerala turf football culture. Set up 5v5, 6v6, or 7v7 squads with visual pitch formations, single-goalkeeper invariant checks, and instant Team A vs Team B split.',
    formats: ['5v5 Turf', '6v6 Turf', '7v7 Ground', '11s Friendly'],
    keyFeatures: [
      'Interactive pitch lineup with drag-and-drop position slots',
      'Strict single-goalkeeper rule invariant enforced in state',
      'Instant WhatsApp room code invites and attendance RSVP',
      'Team A vs Team B derby organizer with balanced positions',
    ],
    sampleFixture: {
      title: 'Malabar Friday Night Derby',
      format: '7v7 Turf (60 mins)',
      time: 'Friday 8:30 PM IST',
      venue: 'Decathlon Arena, Kalamassery',
      confirmed: '14/14 Confirmed',
      details: 'Team A (Bibs) vs Team B (Dark) • GK Locked',
    },
  },
  cricket: {
    id: 'cricket',
    name: 'Cricket',
    badge: 'Box & Turf Cricket',
    tagline: 'Overs, reorderable batting cards & top-down fielding ground',
    description: 'Built for fast-paced box cricket and turf tournaments. Configure match overs, ball types, toss results, dynamic batting lineups, and interactive 360° fielding positions.',
    formats: ['8-Over Box', '10-Over Turf', '12-Over League', '15-Over T15'],
    keyFeatures: [
      'Configurable overs (6 to 20) with bowler over-quota validation',
      'Reorderable batting order cards with captain & wicketkeeper markers',
      'Interactive top-down fielding ground (slip, covers, mid-wicket, long-on)',
      'Toss outcome tracking (Bat/Bowl first) and match status transitions',
    ],
    sampleFixture: {
      title: 'Super 10 Over Box Cricket Trophy',
      format: '10 Overs • Tennis Ball',
      time: 'Saturday 7:00 PM IST',
      venue: 'SkyTurf Cricket Arena, Edappally',
      confirmed: '16/16 Confirmed',
      details: 'Toss: Strikers won & elected to bat • 8/side',
    },
  },
  badminton: {
    id: 'badminton',
    name: 'Badminton',
    badge: 'Singles & Doubles',
    tagline: 'Court scheduling, pair coordination & set-score tracking',
    description: 'Effortless court coordination for indoor wooden and synthetic courts. Organize singles or doubles sessions, manage round-robin court rotations, and track 21-point game sets.',
    formats: ['Singles (1v1)', 'Doubles (2v2)', 'Mixed Doubles', 'King of the Court'],
    keyFeatures: [
      'Instant pairing engine for competitive doubles matches',
      'Indoor court slot scheduling with strict booking advance RSVPs',
      'Set-by-set score recording (Best of 3, 21-point rally format)',
      'Player availability tracking for 4-player and 8-player sessions',
    ],
    sampleFixture: {
      title: 'Shuttle Masters Doubles Night',
      format: 'Doubles • 3-Set Match',
      time: 'Wednesday 6:30 AM IST',
      venue: 'Smash Indoor Badminton Academy, Kakkanad',
      confirmed: '4/4 Ready',
      details: 'Pair A vs Pair B • Yonex Mavis 350 Shuttles',
    },
  },
  volleyball: {
    id: 'volleyball',
    name: 'Volleyball',
    badge: '4v4 & 6v6 Court',
    tagline: 'Rotation tracking, setter roles & attendance quorum',
    description: 'Optimized for local club courts and beach volleyball. Track front-row and back-row rotations, manage setter and spiker assignments, and ensure full 6-player or 4-player court capacity.',
    formats: ['6v6 Standard', '4v4 Beach', 'Rotational Club', 'Tournament Pool'],
    keyFeatures: [
      'Rotational lineup board with setter, libero, and spiker slots',
      'Attendance quorum monitor ensuring minimum 8 or 12 players',
      'Auto-balancing engine for fair height and skill distribution',
      'Real-time attendance lock to prevent court-fee forfeiture',
    ],
    sampleFixture: {
      title: 'Kakkanad Spike & Block Invitational',
      format: '6v6 Standard (Best of 5)',
      time: 'Sunday 5:30 PM IST',
      venue: 'YMCA Floodlit Court, Ernakulam',
      confirmed: '12/12 Confirmed',
      details: 'Rotation A vs Rotation B • Outdoor Tar Court',
    },
  },
};

export function SportShowcase() {
  const [activeSport, setActiveSport] = useState<SportKey>('football');
  const current = SPORTS[activeSport];

  return (
    <section id="sports" className="py-20 lg:py-28 border-t border-border bg-surface/20 relative">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary mb-3">
            <Sparkles className="h-4 w-4" />
            <span>Multi-Sport Engine</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground uppercase leading-tight">
            One Platform. Different Games.{' '}
            <span className="text-primary block mt-1">Same Simplicity.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Every sport has unique positions, formats, and squad sizes. Kalikkanundo gives each sport its custom-tailored coordination logic without losing the fast WhatsApp workflow.
          </p>
        </div>

        {/* Sport Selection Tabs */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-12 flex-wrap">
          {(Object.keys(SPORTS) as SportKey[]).map((key) => {
            const sport = SPORTS[key];
            const isActive = activeSport === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveSport(key)}
                className={`relative flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md scale-105'
                    : 'bg-surface border border-border text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
                }`}
              >
                <span>{sport.name}</span>
                <span
                  className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-surface-subtle text-muted-foreground'
                  }`}
                >
                  {sport.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Sport Showcase Card */}
        <div className="rounded-3xl border border-border bg-surface p-6 sm:p-10 lg:p-12 shadow-card">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left: Sport Description & Specific Features */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-2">
                  <Activity className="h-4 w-4" />
                  <span>{current.name} Coordination Engine</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-foreground">
                  {current.tagline}
                </h3>
                <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {current.description}
                </p>
              </div>

              {/* Supported Formats */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2.5">
                  Supported Match Formats
                </span>
                <div className="flex flex-wrap gap-2">
                  {current.formats.map((fmt) => (
                    <span
                      key={fmt}
                      className="rounded-lg border border-border bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-foreground"
                    >
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>

              {/* Key Sport Capabilities */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Sport-Specific Capabilities
                </span>
                {current.keyFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-foreground/90 font-medium">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <a
                  href={`${siteConfig.appUrl}/login?returnUrl=/squads/new`}
                  className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover transition-colors"
                >
                  <span>Organize a {current.name} Match</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Right: Realistic Sport Interactive Board Graphic */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-primary/20 bg-surface-subtle p-6 shadow-inner space-y-5">
                {/* Visual sport header */}
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/30 text-primary flex items-center justify-center font-black text-sm">
                      {current.name[0]}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{current.sampleFixture.title}</h4>
                      <span className="text-[11px] font-mono text-muted-foreground">{current.sampleFixture.format}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold bg-success/20 text-success px-2.5 py-0.5 rounded-full border border-success/30">
                    {current.sampleFixture.confirmed}
                  </span>
                </div>

                {/* Sport-Specific Graphic Representation */}
                {activeSport === 'football' && (
                  <div className="relative aspect-[16/10] w-full rounded-xl border border-primary/30 bg-[#0B261D] p-3 flex flex-col justify-between overflow-hidden">
                    <div className="absolute inset-2 border border-white/20 rounded pointer-events-none" />
                    <div className="absolute top-1/2 left-2 right-2 h-px bg-white/20 pointer-events-none" />
                    <div className="flex justify-center z-10">
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full shadow">
                        ST: Rahul
                      </span>
                    </div>
                    <div className="flex justify-around px-4 z-10">
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full shadow">
                        LW: Faheem
                      </span>
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full shadow">
                        CAM: Jithin
                      </span>
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full shadow">
                        RW: Zayan
                      </span>
                    </div>
                    <div className="flex justify-around px-8 z-10">
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full shadow">
                        CB: Afnan
                      </span>
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full shadow">
                        CB: Shammas
                      </span>
                    </div>
                    <div className="flex justify-center z-10">
                      <span className="text-[10px] font-bold bg-warning text-black px-2 py-0.5 rounded-full shadow">
                        GK: Riyas (Locked)
                      </span>
                    </div>
                  </div>
                )}

                {activeSport === 'cricket' && (
                  <div className="relative aspect-[16/10] w-full rounded-xl border border-primary/30 bg-[#143224] p-3 flex flex-col justify-between overflow-hidden">
                    {/* Cricket Oval Boundary */}
                    <div className="absolute inset-2 rounded-full border-2 border-dashed border-white/30 pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-28 bg-[#9A7B56]/50 rounded border border-white/30 flex flex-col justify-between items-center py-1">
                      <span className="text-[8px] font-mono text-white font-bold">WKT</span>
                      <span className="text-[8px] font-mono text-white font-bold">22 YDS</span>
                      <span className="text-[8px] font-mono text-white font-bold">WKT</span>
                    </div>
                    <div className="flex justify-between px-6 z-10">
                      <span className="text-[10px] font-bold bg-surface/90 text-foreground px-2 py-0.5 rounded border border-border">
                        Deep Cover
                      </span>
                      <span className="text-[10px] font-bold bg-surface/90 text-foreground px-2 py-0.5 rounded border border-border">
                        Long Off
                      </span>
                    </div>
                    <div className="flex justify-between px-2 z-10">
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded shadow">
                        Bowler: Arjun (2/2 ov)
                      </span>
                      <span className="text-[10px] font-bold bg-warning text-black px-2 py-0.5 rounded shadow">
                        Striker: Ashwin (24*)
                      </span>
                    </div>
                    <div className="flex justify-between px-6 z-10">
                      <span className="text-[10px] font-bold bg-surface/90 text-foreground px-2 py-0.5 rounded border border-border">
                        Wicket Keeper: Riyas (C)
                      </span>
                      <span className="text-[10px] font-bold bg-surface/90 text-foreground px-2 py-0.5 rounded border border-border">
                        Deep Mid-Wicket
                      </span>
                    </div>
                  </div>
                )}

                {activeSport === 'badminton' && (
                  <div className="relative aspect-[16/10] w-full rounded-xl border border-primary/30 bg-[#0D2E2B] p-3 flex flex-col justify-between overflow-hidden">
                    {/* Court lines */}
                    <div className="absolute inset-3 border-2 border-white/30 rounded pointer-events-none" />
                    <div className="absolute top-1/2 left-3 right-3 h-1 bg-white/60 pointer-events-none shadow" />
                    <div className="absolute top-3 bottom-3 left-1/2 w-px bg-white/30 pointer-events-none" />
                    <div className="flex justify-around z-10">
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full shadow">
                        Pair 1: Farhan
                      </span>
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full shadow">
                        Pair 1: Bilal
                      </span>
                    </div>
                    <div className="flex justify-center z-10">
                      <span className="text-[9px] font-bold bg-surface/90 text-primary border border-primary/40 px-2 py-0.5 rounded">
                        NET • 21-PT RALLY
                      </span>
                    </div>
                    <div className="flex justify-around z-10">
                      <span className="text-[10px] font-bold bg-surface text-foreground border border-border px-2.5 py-0.5 rounded-full shadow">
                        Pair 2: Shabeer
                      </span>
                      <span className="text-[10px] font-bold bg-surface text-foreground border border-border px-2.5 py-0.5 rounded-full shadow">
                        Pair 2: Nishad
                      </span>
                    </div>
                  </div>
                )}

                {activeSport === 'volleyball' && (
                  <div className="relative aspect-[16/10] w-full rounded-xl border border-primary/30 bg-[#132A32] p-3 flex flex-col justify-between overflow-hidden">
                    {/* Volleyball court */}
                    <div className="absolute inset-3 border-2 border-white/30 rounded pointer-events-none" />
                    <div className="absolute top-1/2 left-3 right-3 h-1 bg-primary/80 pointer-events-none" />
                    <div className="absolute top-1/3 left-3 right-3 h-px border-t border-dashed border-white/20 pointer-events-none" />
                    <div className="absolute bottom-1/3 left-3 right-3 h-px border-t border-dashed border-white/20 pointer-events-none" />
                    <div className="flex justify-around z-10">
                      <span className="text-[10px] font-bold bg-surface text-foreground border border-border px-2 py-0.5 rounded">
                        Pos 4: Spiker
                      </span>
                      <span className="text-[10px] font-bold bg-surface text-foreground border border-border px-2 py-0.5 rounded">
                        Pos 3: Blocker
                      </span>
                      <span className="text-[10px] font-bold bg-surface text-foreground border border-border px-2 py-0.5 rounded">
                        Pos 2: Setter
                      </span>
                    </div>
                    <div className="flex justify-center z-10">
                      <span className="text-[9px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded">
                        VOLLEYBALL NET • ROTATION ACTIVE
                      </span>
                    </div>
                    <div className="flex justify-around z-10">
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded shadow">
                        Pos 5: Back L
                      </span>
                      <span className="text-[10px] font-bold bg-warning text-black px-2 py-0.5 rounded shadow">
                        Pos 6: Libero
                      </span>
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded shadow">
                        Pos 1: Server
                      </span>
                    </div>
                  </div>
                )}

                {/* Fixture Venue & Match Details Footer */}
                <div className="pt-3 border-t border-border space-y-1 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-primary" />
                      <span>{current.sampleFixture.time}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary" />
                      <span className="truncate max-w-[180px]">{current.sampleFixture.venue}</span>
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-primary">
                    {current.sampleFixture.details}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
