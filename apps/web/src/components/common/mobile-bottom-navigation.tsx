import { useState } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  House,
  Users,
  Plus,
  CalendarDays,
  UserRound,
  Shield,
  UserPlus,
  X,
  ChevronRight,
} from 'lucide-react';
import { squadApi } from '@/modules/squads/api';
import { matchApi } from '@/modules/matches/api';
import { queryKeys } from '@/infrastructure/query-keys';
import { BrandLogo } from './brand-logo';
import { activeSportForPath } from './sport-switcher';
import { useUIStore } from '@/stores/ui-store';

export function MobileBottomNavigation() {
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const openSportDrawer = useUIStore((s) => s.openSportDrawer);
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  // Active state matching rules
  const isHomeActive = pathname === '/dashboard' || pathname === '/';
  const isSquadsActive =
    (pathname === '/squads' || pathname.startsWith('/squads/')) &&
    !pathname.includes('/matches/');
  const isMatchesActive =
    pathname === '/matches' ||
    pathname.startsWith('/matches/') ||
    pathname.includes('/matches/') ||
    activeSportForPath(pathname) !== null;
  const isProfileActive = pathname.startsWith('/profile');

  // Query user squads for dynamic match creation shortcut
  const { data: squads = [] } = useQuery({
    queryKey: queryKeys.squads.mySquads,
    queryFn: () => squadApi.listMySquads(),
    staleTime: 60 * 1000,
  });

  // Query user matches for dynamic upcoming count badge
  const { data: allMatches = [] } = useQuery({
    queryKey: queryKeys.matches.all,
    queryFn: () => matchApi.listUserMatches(),
    staleTime: 60 * 1000,
  });

  const upcomingCount = allMatches.filter((m) => {
    const d = new Date(m.startsAt);
    return (
      (m.status === 'scheduled' || m.status === 'in_progress') &&
      d.getTime() + 7200000 >= Date.now()
    );
  }).length;

  const handleNavigate = (path: string) => {
    setIsActionSheetOpen(false);
    navigate({ to: path });
  };

  const handleCreateMatch = () => {
    setIsActionSheetOpen(false);
    openSportDrawer();
  };

  return (
    <>
      {/* 1. FLOATING PILL CONTAINER */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-40 mx-auto max-w-[440px] lg:hidden select-none"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="relative flex h-[66px] items-center justify-around rounded-[26px] border border-border/80 bg-surface/95 px-2 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.65)]">
          {/* Position 1: Home */}
          <button
            type="button"
            onClick={() => handleNavigate('/dashboard')}
            className={`group relative flex flex-1 flex-col items-center justify-center py-1 transition-all ${
              isHomeActive
                ? 'text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground font-medium'
            }`}
            aria-label="Home Dashboard"
          >
            <div
              className={`flex h-8 w-11 items-center justify-center rounded-full transition-colors ${
                isHomeActive ? 'bg-primary/15' : 'group-hover:bg-surface-subtle'
              }`}
            >
              <House
                className={`h-5 w-5 transition-transform ${
                  isHomeActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'
                }`}
              />
            </div>
            <span
              className={`text-[10px] tracking-tight transition-colors ${
                isHomeActive ? 'font-bold text-foreground' : 'font-medium'
              }`}
            >
              Home
            </span>
          </button>

          {/* Position 2: Squads */}
          <button
            type="button"
            onClick={() => handleNavigate('/squads')}
            className={`group relative flex flex-1 flex-col items-center justify-center py-1 transition-all ${
              isSquadsActive
                ? 'text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground font-medium'
            }`}
            aria-label="Squads Hub"
          >
            <div
              className={`flex h-8 w-11 items-center justify-center rounded-full transition-colors ${
                isSquadsActive ? 'bg-primary/15' : 'group-hover:bg-surface-subtle'
              }`}
            >
              <Users
                className={`h-5 w-5 transition-transform ${
                  isSquadsActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'
                }`}
              />
            </div>
            <span
              className={`text-[10px] tracking-tight transition-colors ${
                isSquadsActive ? 'font-bold text-foreground' : 'font-medium'
              }`}
            >
              Squads
            </span>
          </button>

          {/* Position 3: Raised Center Action Button */}
          <div className="relative flex flex-1 flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setIsActionSheetOpen((prev) => !prev)}
              className="absolute -top-4 flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[#0B1F19] border-2 border-[#B7F34B] shadow-[0_8px_20px_rgba(183,243,75,0.28)] active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7F34B] z-10"
              aria-label="Create or join squad or schedule match"
              title="Create Actions"
            >
              <Plus
                className={`h-7 w-7 text-[#B7F34B] stroke-[2.75] transition-transform duration-200 ${
                  isActionSheetOpen ? 'rotate-45 text-white' : ''
                }`}
              />
            </button>
            <span className="mt-7 text-[10px] font-semibold text-muted-foreground tracking-tight">
              Create
            </span>
          </div>

          {/* Position 4: Matches */}
          <button
            type="button"
            onClick={() => handleNavigate('/matches')}
            className={`group relative flex flex-1 flex-col items-center justify-center py-1 transition-all ${
              isMatchesActive
                ? 'text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground font-medium'
            }`}
            aria-label="Matches and Fixtures"
          >
            <div
              className={`relative flex h-8 w-11 items-center justify-center rounded-full transition-colors ${
                isMatchesActive ? 'bg-primary/15' : 'group-hover:bg-surface-subtle'
              }`}
            >
              <CalendarDays
                className={`h-5 w-5 transition-transform ${
                  isMatchesActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'
                }`}
              />
              {upcomingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-extrabold text-primary-foreground shadow-sm animate-pulse">
                  {upcomingCount}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight transition-colors ${
                isMatchesActive ? 'font-bold text-foreground' : 'font-medium'
              }`}
            >
              Games
            </span>
          </button>

          {/* Position 5: Profile */}
          <button
            type="button"
            onClick={() => handleNavigate('/profile')}
            className={`group relative flex flex-1 flex-col items-center justify-center py-1 transition-all ${
              isProfileActive
                ? 'text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground font-medium'
            }`}
            aria-label="Player Profile"
          >
            <div
              className={`flex h-8 w-11 items-center justify-center rounded-full transition-colors ${
                isProfileActive ? 'bg-primary/15' : 'group-hover:bg-surface-subtle'
              }`}
            >
              <UserRound
                className={`h-5 w-5 transition-transform ${
                  isProfileActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'
                }`}
              />
            </div>
            <span
              className={`text-[10px] tracking-tight transition-colors ${
                isProfileActive ? 'font-bold text-foreground' : 'font-medium'
              }`}
            >
              Profile
            </span>
          </button>
        </div>
      </nav>

      {/* 2. COMPACT ACTION SHEET / BOTTOM DRAWER */}
      {isActionSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsActionSheetOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="action-sheet-title"
        >
          <div
            className="w-full max-w-md mx-auto rounded-t-[28px] border-t border-border bg-surface p-5 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-200"
            style={{
              paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pull indicator */}
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <BrandLogo size="sm" showName={false} />
                <div>
                  <h3 id="action-sheet-title" className="text-base font-extrabold text-foreground">
                    Quick Actions
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Manage your Kerala turf squads & fixtures
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsActionSheetOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-surface-subtle hover:text-foreground transition-colors"
                aria-label="Close action menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Action options list */}
            <div className="mt-4 space-y-2.5">
              {/* Option 1: Create Squad */}
              <button
                type="button"
                onClick={() => handleNavigate('/squads/new')}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface-subtle/50 p-3.5 text-left transition-all hover:bg-surface-subtle active:scale-[0.98]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Create New Squad</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Start a permanent squad for your regular turf group
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </button>

              {/* Option 2: Join Squad */}
              <button
                type="button"
                onClick={() => handleNavigate('/join')}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface-subtle/50 p-3.5 text-left transition-all hover:bg-surface-subtle active:scale-[0.98]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Join with Room Code</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enter a 16-character code or paste an invitation link
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </button>

              {/* Option 3: Schedule Match */}
              <button
                type="button"
                onClick={handleCreateMatch}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface-subtle/50 p-3.5 text-left transition-all hover:bg-surface-subtle active:scale-[0.98]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Schedule Match</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {squads.length > 0
                        ? 'Set kickoff time, venue, and 5v5/7v7 headcount'
                        : 'Create or join a squad first to organize matches'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </button>
            </div>

            {/* Cancel Button */}
            <div className="mt-4 pt-2">
              <button
                type="button"
                onClick={() => setIsActionSheetOpen(false)}
                className="w-full h-11 rounded-xl border border-border bg-surface font-semibold text-xs text-muted-foreground hover:bg-surface-subtle hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
