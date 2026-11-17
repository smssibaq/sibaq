'use client';

import React, { useState } from 'react';
import { ArrowRight, Sparkles, Check, Users } from 'lucide-react';
import { siteConfig } from '@/config/site';

type FormationPreset = '2-3-1' | '3-2-1' | '2-2-2';

interface PlayerPosition {
  role: string;
  name: string;
  x: number; // percentage from left (0 to 100)
  y: number; // percentage from top (0 to 100)
  isGk?: boolean;
}

const FORMATIONS: Record<FormationPreset, { label: string; desc: string; players: PlayerPosition[] }> = {
  '2-3-1': {
    label: '2-3-1 Attacking',
    desc: 'Wide wingers and high pressing striker for standard 7-a-side matches.',
    players: [
      { role: 'GK', name: 'Riyas', x: 50, y: 88, isGk: true },
      { role: 'LB', name: 'Afnan', x: 28, y: 72 },
      { role: 'RB', name: 'Shammas', x: 72, y: 72 },
      { role: 'LM', name: 'Shibili', x: 20, y: 46 },
      { role: 'CM', name: 'Faheem', x: 50, y: 52 },
      { role: 'RM', name: 'Jithin', x: 80, y: 46 },
      { role: 'ST', name: 'Rahul', x: 50, y: 20 },
    ],
  },
  '3-2-1': {
    label: '3-2-1 Solid Shield',
    desc: 'Three backline anchors with two pivot midfielders for tight defensive stability.',
    players: [
      { role: 'GK', name: 'Riyas', x: 50, y: 88, isGk: true },
      { role: 'LB', name: 'Afnan', x: 22, y: 74 },
      { role: 'CB', name: 'Salman', x: 50, y: 76 },
      { role: 'RB', name: 'Shammas', x: 78, y: 74 },
      { role: 'CDM', name: 'Faheem', x: 36, y: 50 },
      { role: 'CDM', name: 'Jithin', x: 64, y: 50 },
      { role: 'ST', name: 'Rahul', x: 50, y: 22 },
    ],
  },
  '2-2-2': {
    label: '2-2-2 Balanced Duo',
    desc: 'Two solid lines with paired forwards to exploit turf counter-attacks.',
    players: [
      { role: 'GK', name: 'Riyas', x: 50, y: 88, isGk: true },
      { role: 'DEF', name: 'Afnan', x: 32, y: 72 },
      { role: 'DEF', name: 'Shammas', x: 68, y: 72 },
      { role: 'MID', name: 'Faheem', x: 32, y: 48 },
      { role: 'MID', name: 'Jithin', x: 68, y: 48 },
      { role: 'ATT', name: 'Rahul', x: 35, y: 22 },
      { role: 'ATT', name: 'Razin', x: 65, y: 22 },
    ],
  },
};

export function FormationShowcase() {
  const [activePreset, setActivePreset] = useState<FormationPreset>('2-3-1');
  const currentFormation = FORMATIONS[activePreset];

  return (
    <section id="formations" className="py-20 lg:py-28 border-t border-border bg-surface/40">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Context & Interactive Preset Controls */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Interactive Tactical Pitch</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground uppercase leading-tight">
              Build Your XI.{' '}
              <span className="text-primary block mt-1">Your Way.</span>
            </h2>

            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Arrange your players, experiment with formations, and prepare your squad for every match.
              Drag players freely across the turf or choose from tactical 5v5, 6v6, and 7v7 presets.
            </p>

            {/* Formation Preset Selector Buttons */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Choose Formation Preset:
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {(['2-3-1', '3-2-1', '2-2-2'] as FormationPreset[]).map((preset) => {
                  const isSelected = activePreset === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setActivePreset(preset)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/40 shadow-sm'
                          : 'border-border bg-surface hover:border-primary/40 text-foreground'
                      }`}
                    >
                      <span className="text-sm font-black font-mono">{preset}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                        {preset === '2-3-1' ? 'Attack' : preset === '3-2-1' ? 'Shield' : 'Duo'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground/90 italic pt-1">
                {currentFormation.desc}
              </p>
            </div>

            {/* Action CTA */}
            <div className="pt-4">
              <a
                href={`${siteConfig.appUrl}/login?returnUrl=/squads/new`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-hover transition-all"
              >
                <span>Customize Your Lineup</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Right Column: Premium Tactical Football Pitch */}
          <div className="lg:col-span-7">
            <div className="relative mx-auto w-full max-w-md sm:max-w-lg rounded-2xl border border-primary/30 bg-[#071F17] p-4 sm:p-6 shadow-modal overflow-hidden">
              {/* Pitch Header */}
              <div className="flex items-center justify-between pb-3 border-b border-primary/20 text-xs">
                <span className="font-bold text-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span>Tactical Pitch Board • 7-a-side</span>
                </span>
                <span className="font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
                  {currentFormation.label}
                </span>
              </div>

              {/* Pitch Area */}
              <div className="relative mt-4 aspect-[10/13] w-full rounded-xl border-2 border-white/20 bg-gradient-to-b from-[#092B20] to-[#0D382A] shadow-inner overflow-hidden">
                {/* Touchlines and Pitch Markings */}
                <div className="absolute inset-2 border border-white/25 rounded-sm pointer-events-none" />
                {/* Halfway line */}
                <div className="absolute top-1/2 left-2 right-2 h-px bg-white/25 pointer-events-none" />
                {/* Center Circle */}
                <div className="absolute top-1/2 left-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 pointer-events-none" />
                {/* Top Penalty Box & Arc */}
                <div className="absolute top-2 left-1/4 right-1/4 h-14 border-b border-x border-white/25 rounded-b pointer-events-none" />
                <div className="absolute top-16 left-1/2 -translate-x-1/2 h-6 w-12 border-b border-white/25 rounded-b-full pointer-events-none" />
                {/* Bottom Penalty Box & Arc */}
                <div className="absolute bottom-2 left-1/4 right-1/4 h-14 border-t border-x border-white/25 rounded-t pointer-events-none" />
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 h-6 w-12 border-t border-white/25 rounded-t-full pointer-events-none" />

                {/* Animated / Positioned Player Tokens */}
                {currentFormation.players.map((player) => (
                  <div
                    key={player.name}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-500 ease-out z-10"
                    style={{ left: `${player.x}%`, top: `${player.y}%` }}
                  >
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center font-black text-xs shadow-lg transition-transform hover:scale-110 cursor-pointer ${
                        player.isGk
                          ? 'bg-warning text-black ring-2 ring-warning/60 shadow-warning/20'
                          : 'bg-primary text-primary-foreground ring-2 ring-primary/60 shadow-primary/30'
                      }`}
                    >
                      {player.role}
                    </div>
                    <span className="text-[10px] font-bold text-foreground mt-1 bg-surface/90 px-2 py-0.5 rounded border border-border shadow-sm truncate max-w-[70px]">
                      {player.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pitch Footer Stats */}
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-primary/20">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span>7 Players in Formation</span>
                </span>
                <span className="text-[11px] font-mono text-muted-foreground/70">
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
