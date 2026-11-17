import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  CalendarDays,
  Shield,
  Users,
  UserPlus,
  User,
  LogOut,
  Sun,
  Moon,
  ExternalLink,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { useUIStore } from '../../stores/ui-store';
import { useAuth } from '../../modules/auth/auth-provider';
import { Avatar } from '../ui/avatar';
import { BrandLogo } from './brand-logo';
import { Breadcrumbs } from './breadcrumb';
import { MobileBottomNavigation } from './mobile-bottom-navigation';
import { squadApi } from '@/modules/squads/api';
import { matchApi } from '@/modules/matches/api';
import { queryKeys } from '@/infrastructure/query-keys';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: 'Matches',
    href: '/matches',
    icon: <CalendarDays className="h-5 w-5" />,
  },
  {
    label: 'Squads',
    href: '/squads',
    icon: <Users className="h-5 w-5" />,
    badge: 'Hub',
  },
  {
    label: 'Join Squad',
    href: '/join',
    icon: <UserPlus className="h-5 w-5" />,
  },
  {
    label: 'Player Profile',
    href: '/profile',
    icon: <User className="h-5 w-5" />,
  },
];

/**
 * Returns dynamic contextual title and breadcrumb info based on active pathname
 */
function getPageBreadcrumbs(pathname: string): { section: string; title: string } {
  if (pathname === '/dashboard' || pathname === '/') {
    return { section: 'Home', title: 'Dashboard Overview' };
  }
  if (pathname === '/matches') {
    return { section: 'Fixtures', title: 'Match Center' };
  }
  if (pathname.startsWith('/matches/') && pathname.includes('/lineup')) {
    return { section: 'Matches', title: 'Tactical Lineup Board' };
  }
  if (pathname.startsWith('/matches/')) {
    return { section: 'Matches', title: 'Match Details & RSVP' };
  }
  if (pathname === '/squads') {
    return { section: 'Rosters', title: 'Squad Hub' };
  }
  if (pathname === '/squads/new') {
    return { section: 'Squads', title: 'Create New Squad' };
  }
  if (pathname.includes('/matches/new')) {
    return { section: 'Schedule', title: 'New Match Fixture' };
  }
  if (pathname.includes('/members')) {
    return { section: 'Squads', title: 'Squad Roster & Members' };
  }
  if (pathname.includes('/settings')) {
    return { section: 'Squads', title: 'Squad Settings' };
  }
  if (pathname.startsWith('/squads/')) {
    return { section: 'Squads', title: 'Squad Management' };
  }
  if (pathname === '/join') {
    return { section: 'Invitations', title: 'Join Squad with Code' };
  }
  if (pathname.startsWith('/invite/')) {
    return { section: 'Invitations', title: 'Squad Invitation' };
  }
  if (pathname.startsWith('/profile')) {
    return { section: 'Account', title: 'Player Profile' };
  }
  if (pathname.startsWith('/admin')) {
    return { section: 'System', title: 'Admin Console' };
  }
  return { section: 'Turf XI', title: 'Kalikkanundo' };
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const { user, profile, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const landingUrl = import.meta.env.VITE_LANDING_URL || 'https://kalikkanundo-web.vercel.app';

  // 1. Fetch user squads for quick actions & badge
  const { data: squads = [] } = useQuery({
    queryKey: queryKeys.squads.mySquads,
    queryFn: () => squadApi.listMySquads(),
    staleTime: 60 * 1000,
  });

  // 2. Fetch matches for upcoming count badge
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

  // Close quick action popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setIsQuickActionOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (path: string) => {
    setIsQuickActionOpen(false);
    navigate({ to: path });
  };

  const handleScheduleMatch = () => {
    setIsQuickActionOpen(false);
    if (squads && squads.length > 0) {
      navigate({
        to: '/squads/$squadId/matches/new',
        params: { squadId: squads[0].id },
      });
    } else {
      navigate({ to: '/squads/new' });
    }
  };

  const breadcrumbs = getPageBreadcrumbs(currentPath);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar Navigation - Desktop only */}
      <aside
        className={`hidden lg:flex inset-y-0 left-0 z-30 flex-col border-r border-border bg-surface shrink-0 max-h-screen sticky top-0 relative transition-[width] duration-200 ease-in-out motion-reduce:transition-none ${sidebarCollapsed ? 'w-[72px]' : 'w-60'
          }`}
        aria-label="Application Sidebar"
      >
        {/* Interactive Right Border Resizer / Toggle Edge */}
        <div
          role="button"
          tabIndex={0}
          onClick={toggleSidebarCollapsed}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleSidebarCollapsed();
            }
          }}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Click border to expand sidebar' : 'Click border to collapse sidebar'}
          className="group/border absolute top-0 -right-2 z-40 h-full w-4 cursor-col-resize select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {/* Subtle Hairline Hover Highlight */}
          <div className="absolute inset-y-0 left-1.5 w-1 bg-transparent group-hover/border:bg-primary/50 group-focus-visible/border:bg-primary transition-colors duration-150 rounded-full" />
        </div>

        {/* Brand Header */}
        <div
          className={`flex h-16 items-center border-b border-border transition-all duration-200 ${sidebarCollapsed ? 'justify-center px-2' : 'px-5'
            }`}
        >
          {sidebarCollapsed ? (
            <div className="flex items-center justify-center">
              <BrandLogo href="/dashboard" size="sm" showName={false} />
            </div>
          ) : (
            <div className="flex items-center">
              <BrandLogo href="/dashboard" size="md" />
            </div>
          )}
        </div>

        {/* Quick Action Primary Button */}
        <div className={`pt-3.5 pb-2 relative ${sidebarCollapsed ? 'px-2 flex justify-center' : 'px-3'}`} ref={actionMenuRef}>
          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={() => setIsQuickActionOpen((prev) => !prev)}
              className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md hover:bg-primary-hover active:scale-[0.98] transition-all"
              title="Quick Action"
              aria-label="Quick Action"
            >
              <Plus className="h-5 w-5 stroke-[2.5]" />
              <div className="pointer-events-none absolute left-full ml-3 z-50 hidden rounded-md bg-foreground px-2.5 py-1 text-xs font-semibold text-background shadow-lg whitespace-nowrap group-hover:flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                <span>Quick Action</span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsQuickActionOpen((prev) => !prev)}
              className="flex h-10 w-full items-center justify-between rounded-xl bg-primary text-primary-foreground px-3.5 text-xs font-bold shadow-md hover:bg-primary-hover active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Quick Action</span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${isQuickActionOpen ? 'rotate-180' : ''
                  }`}
              />
            </button>
          )}

          {/* Quick Action Dropdown Popover */}
          {isQuickActionOpen && (
            <div
              className={`absolute top-14 z-50 rounded-xl border border-border bg-surface p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 space-y-1 ${sidebarCollapsed ? 'left-14 w-56' : 'left-3 right-3'
                }`}
            >
              <button
                type="button"
                onClick={handleScheduleMatch}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-surface-subtle transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CalendarDays className="h-3.5 w-3.5" />
                </div>
                <div className="truncate">
                  <p className="font-bold">Schedule Match</p>
                  <p className="text-[10px] text-muted-foreground">Kickoff, venue & format</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('/squads/new')}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-surface-subtle transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Shield className="h-3.5 w-3.5" />
                </div>
                <div className="truncate">
                  <p className="font-bold">Create Squad</p>
                  <p className="text-[10px] text-muted-foreground">Permanent turf squad</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('/join')}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-surface-subtle transition-colors border-t border-border/60 pt-1.5"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-subtle text-muted-foreground">
                  <UserPlus className="h-3.5 w-3.5" />
                </div>
                <div className="truncate">
                  <p className="font-bold">Join with Code</p>
                  <p className="text-[10px] text-muted-foreground">Enter 16-character code</p>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav
          className={`flex-1 space-y-1 py-2 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}
          aria-label="Sidebar links"
        >
          {NAV_ITEMS.filter((item) => !item.adminOnly || role === 'admin').map((item) => {
            const isActive =
              currentPath === item.href ||
              (item.href !== '/dashboard' && currentPath.startsWith(item.href));

            const badgeValue =
              item.href === '/matches' && upcomingCount > 0
                ? `${upcomingCount} Next`
                : item.href === '/squads' && squads.length > 0
                  ? `${squads.length}`
                  : item.badge;

            if (sidebarCollapsed) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => handleNavigate(item.href)}
                  className={`group relative flex w-full h-10 items-center justify-center rounded-xl transition-all ${isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground'
                    }`}
                  title={item.label}
                  aria-label={item.label}
                >
                  <div className="flex items-center justify-center">
                    {item.icon}
                  </div>
                  {badgeValue && (
                    <span className="absolute top-1.5 right-2 h-2 w-2 rounded-full bg-primary ring-2 ring-surface" />
                  )}
                  {/* Floating Tooltip */}
                  <div className="pointer-events-none absolute left-full ml-3 z-50 hidden rounded-md bg-foreground px-2.5 py-1 text-xs font-semibold text-background shadow-lg whitespace-nowrap group-hover:flex group-focus-visible:flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                    <span>{item.label}</span>
                    {badgeValue && (
                      <span className="rounded bg-primary/20 px-1 py-0.5 text-[9px] font-mono text-primary font-bold">
                        {badgeValue}
                      </span>
                    )}
                  </div>
                </button>
              );
            }

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => handleNavigate(item.href)}
                className={`flex w-full h-10 items-center justify-between rounded-xl px-3 text-xs font-bold transition-all ${isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {badgeValue && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider ${isActive
                        ? 'bg-black/20 text-primary-foreground'
                        : item.href === '/matches' && upcomingCount > 0
                          ? 'bg-primary/20 text-primary font-black animate-pulse'
                          : 'bg-surface-subtle text-muted-foreground'
                      }`}
                  >
                    {badgeValue}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Public Landing Link */}
        <div className={`border-t border-border py-2 ${sidebarCollapsed ? 'p-2 flex justify-center' : 'px-3'}`}>
          {sidebarCollapsed ? (
            <a
              href={landingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-subtle hover:text-foreground transition-colors"
              title="Landing Website"
              aria-label="Landing Website"
            >
              <ExternalLink className="h-4 w-4" />
              <div className="pointer-events-none absolute left-full ml-3 z-50 hidden rounded-md bg-foreground px-2.5 py-1 text-xs font-semibold text-background shadow-lg whitespace-nowrap group-hover:flex items-center animate-in fade-in zoom-in-95 duration-150">
                <span>Landing Website</span>
              </div>
            </a>
          ) : (
            <a
              href={landingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 items-center justify-between rounded-lg px-3 text-xs text-muted-foreground hover:bg-surface-subtle hover:text-foreground transition-colors"
            >
              <span>Landing Website</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* User Identity & Sign Out Footer */}
        <div className={`border-t border-border bg-surface-subtle/40 ${sidebarCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3.5'}`}>
          {sidebarCollapsed ? (
            <>
              <button
                type="button"
                onClick={() => handleNavigate('/profile')}
                className="group relative flex h-9 w-9 items-center justify-center rounded-full hover:opacity-80 transition-opacity"
                title={profile?.display_name || user?.email || 'Player Profile'}
                aria-label="Player Profile"
              >
                <Avatar
                  src={profile?.avatar_url}
                  fallback={profile?.display_name || user?.email || 'P'}
                  size="sm"
                  className="h-8 w-8 text-xs border-primary/20"
                />
                <div className="pointer-events-none absolute left-full ml-3 z-50 hidden rounded-md bg-foreground px-2.5 py-1 text-xs font-semibold text-background shadow-lg whitespace-nowrap group-hover:flex flex-col animate-in fade-in zoom-in-95 duration-150">
                  <span className="font-bold">{profile?.display_name || user?.email || 'Player'}</span>
                  <span className="text-[10px] text-primary uppercase font-mono font-bold">
                    {profile?.preferred_position || 'Squad Member'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => signOut()}
                className="group relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <div className="pointer-events-none absolute left-full ml-3 z-50 hidden rounded-md bg-foreground px-2.5 py-1 text-xs font-semibold text-background shadow-lg whitespace-nowrap group-hover:flex animate-in fade-in zoom-in-95 duration-150">
                  <span>Sign out</span>
                </div>
              </button>
            </>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleNavigate('/profile')}
                className="flex items-center gap-2.5 overflow-hidden text-left hover:opacity-80 transition-opacity flex-1 min-w-0"
                title="View Player Profile"
              >
                <Avatar
                  src={profile?.avatar_url}
                  fallback={profile?.display_name || user?.email || 'P'}
                  size="sm"
                  className="h-8 w-8 text-xs border-primary/20 shrink-0"
                />
                <div className="truncate min-w-0">
                  <p className="truncate text-xs font-bold text-foreground">
                    {profile?.display_name || user?.email || 'Player'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span className="text-[10px] font-mono font-bold uppercase text-primary truncate">
                      {profile?.preferred_position || 'Squad Member'}
                    </span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-lg p-2 text-muted-foreground hover:bg-surface hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger transition-colors shrink-0"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Bar Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 sm:px-6 lg:px-8 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile Brand Identity */}
            <BrandLogo href="/dashboard" size="sm" className="lg:hidden" />

            <span className="hidden md:inline-block lg:hidden text-border shrink-0">/</span>

            {/* Dynamic Contextual Breadcrumbs - Hidden on mobile (<768px), visible on md+ */}
            <Breadcrumbs section={breadcrumbs.section} title={breadcrumbs.title} />
          </div>

          {/* Header Right Actions: Theme Switcher & Profile Avatar */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-surface-subtle hover:text-foreground transition-all duration-200 active:scale-95 shadow-sm"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-warning transition-transform duration-200 hover:rotate-45" />
              ) : (
                <Moon className="h-4 w-4 text-primary transition-transform duration-200 hover:-rotate-12" />
              )}
            </button>

            {user && (
              <button
                type="button"
                onClick={() => handleNavigate('/profile')}
                className="flex items-center rounded-full hover:ring-2 hover:ring-primary/40 transition-all ml-1 shrink-0"
                title="Player Profile"
              >
                <Avatar
                  src={profile?.avatar_url}
                  fallback={profile?.display_name || user?.email || 'P'}
                  size="sm"
                  className="h-8 w-8 text-xs border-primary/20"
                />
              </button>
            )}
          </div>
        </header>

        {/* Page Content Body with bottom clearance for floating mobile navigation */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-24 sm:pb-32 lg:pb-8">
          <div className="mx-auto max-w-container">{children}</div>
        </main>

        {/* Floating Mobile Bottom Navigation */}
        <MobileBottomNavigation />
      </div>
    </div>
  );
}
