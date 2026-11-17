import React, { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { X, ChevronRight, Sparkles } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { squadApi } from '@/modules/squads/api';
import { queryKeys } from '@/infrastructure/query-keys';
import { ShuttleIcon } from '@/modules/badminton/icon';
import { CricketIcon } from '@/modules/cricket/icon';

// Minimal crisp SVG for Football
function FootballIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m12 7-3.5 2.5 1.5 4h4l1.5-4z" />
      <path d="m12 7 1-5" />
      <path d="m8.5 9.5-4.5-2" />
      <path d="m10 13.5-3 3.5" />
      <path d="m14 13.5 3 3.5" />
      <path d="m15.5 9.5 4.5-2" />
    </svg>
  );
}

// Minimal crisp SVG for Volleyball
function VolleyballIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m12 12-4-9" />
      <path d="m12 12 9-4" />
      <path d="m12 12-5 9" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10" />
      <path d="M2.5 15a15.3 15.3 0 0 1 9.5-3 15.3 15.3 0 0 1 9.5 3" />
    </svg>
  );
}

interface SportOption {
  id: string;
  emoji: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badge: string;
  getPath: (firstSquadId?: string) => string;
}

export function SportSelectionDrawer() {
  const navigate = useNavigate();
  const isOpen = useUIStore((s) => s.isSportDrawerOpen);
  const closeDrawer = useUIStore((s) => s.closeSportDrawer);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Fetch squads to pass to Football route
  const { data: squads = [] } = useQuery({
    queryKey: queryKeys.squads.mySquads,
    queryFn: () => squadApi.listMySquads(),
    enabled: isOpen,
  });

  const firstSquadId = squads[0]?.id;

  const SPORT_OPTIONS: SportOption[] = [
    {
      id: 'football',
      emoji: '⚽',
      name: 'Football',
      tagline: 'Organize a turf match',
      description: '5v5, 6v6 or 7v7 turf match with pitch formations and squad RSVPs',
      icon: FootballIcon,
      accentColor: 'from-emerald-500/20 to-emerald-500/5',
      badge: '5v5 • 7v7 Turf',
      getPath: (squadId) => (squadId ? `/squads/${squadId}/matches/new` : '/squads/new'),
    },
    {
      id: 'badminton',
      emoji: '🏸',
      name: 'Badminton',
      tagline: 'Singles or doubles',
      description: 'Indoor court booking, pairs assignment, and 21-point rally tracking',
      icon: ShuttleIcon,
      accentColor: 'from-cyan-500/20 to-cyan-500/5',
      badge: 'Singles • Doubles',
      getPath: () => '/badminton?create=true',
    },
    {
      id: 'cricket',
      emoji: '🏏',
      name: 'Cricket',
      tagline: 'Plan your cricket match',
      description: 'Box or turf cricket with custom overs, batting orders & fielding',
      icon: CricketIcon,
      accentColor: 'from-amber-500/20 to-amber-500/5',
      badge: 'Box • Overs',
      getPath: () => '/cricket/create',
    },
    {
      id: 'volleyball',
      emoji: '🏐',
      name: 'Volleyball',
      tagline: 'Set up your game',
      description: '6v6 or 4v4 court match with rotation lineups & attendance quorum',
      icon: VolleyballIcon,
      accentColor: 'from-orange-500/20 to-orange-500/5',
      badge: '6v6 • Rotation',
      getPath: () => '/volleyball/create',
    },
  ];

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeDrawer]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectSport = (sport: SportOption) => {
    closeDrawer();
    const targetPath = sport.getPath(firstSquadId);
    navigate({ to: targetPath });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="sport-drawer-title">
      {/* Backdrop Dim Overlay */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer Container: Slide from right on desktop, Bottom sheet on mobile */}
      <div
        ref={drawerRef}
        className="fixed z-50 flex flex-col bg-surface border-border shadow-2xl transition-all duration-300 ease-out
          /* Desktop Styles: Slide from right */
          md:inset-y-0 md:right-0 md:w-[420px] md:border-l md:animate-in md:slide-in-from-right md:duration-300
          /* Mobile Styles: Bottom sheet */
          inset-x-0 bottom-0 max-h-[90vh] rounded-t-3xl border-t animate-in slide-in-from-bottom duration-300 pb-safe"
      >
        {/* Mobile Drag Handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-12 rounded-full bg-border" />
        </div>

        {/* Drawer Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-border/70">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Multi-Sport Scheduler</span>
            </div>
            <h2 id="sport-drawer-title" className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              What are we playing?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Choose a sport to schedule your game.
            </p>
          </div>

          <button
            type="button"
            onClick={closeDrawer}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-subtle text-muted-foreground hover:bg-surface hover:text-foreground transition-colors shrink-0"
            aria-label="Close sport selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sport Cards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {SPORT_OPTIONS.map((sport) => {
            const Icon = sport.icon;
            return (
              <button
                key={sport.id}
                type="button"
                onClick={() => handleSelectSport(sport)}
                className="group relative w-full rounded-2xl border border-border bg-surface p-4 text-left transition-all duration-200 
                  hover:border-primary/50 hover:bg-surface-subtle hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
              >
                <div className="flex items-start gap-4">
                  {/* Sport Emoji / Icon Badge */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-subtle border border-border group-hover:border-primary/40 group-hover:bg-primary/10 transition-colors">
                    <span className="text-2xl select-none" role="img" aria-label={sport.name}>
                      {sport.emoji}
                    </span>
                  </div>

                  {/* Sport Info */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                        <span>{sport.name}</span>
                        <Icon className="h-4 w-4 text-primary/70 group-hover:text-primary transition-colors" />
                      </h3>
                      <span className="text-[10px] font-bold text-muted-foreground bg-surface-subtle border border-border/80 px-2 py-0.5 rounded-full shrink-0">
                        {sport.badge}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-foreground/90 mb-1">
                      {sport.tagline}
                    </p>

                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {sport.description}
                    </p>
                  </div>

                  {/* Chevron Right indicator */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-2">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Drawer Footer Notice */}
        <div className="p-4 sm:p-5 border-t border-border/70 bg-surface-subtle/50 text-center">
          <p className="text-[11px] text-muted-foreground">
            Looking to join an existing game?{' '}
            <button
              type="button"
              onClick={() => {
                closeDrawer();
                navigate({ to: '/join' });
              }}
              className="text-primary font-bold hover:underline"
            >
              Enter room code
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
