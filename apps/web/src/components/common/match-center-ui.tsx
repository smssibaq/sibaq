import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { calculateCountdown } from '@/lib/dates';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Trophy,
  ArrowRight,
  Shield,
  Activity,
} from 'lucide-react';

/**
 * Helper to compute human-friendly countdown text like "In 2d 4h" or "Live / Kickoff Now"
 */
export function formatCountdownText(startsAt: string | null | undefined): string {
  if (!startsAt) return '';
  const countdown = calculateCountdown(startsAt);
  if (countdown.isComplete) return 'Live / Ready';
  if (countdown.days > 0) return `In ${countdown.days}d ${countdown.hours}h`;
  if (countdown.hours > 0) return `In ${countdown.hours}h ${countdown.minutes}m`;
  return `In ${countdown.minutes}m`;
}

// ---------------------------------------------------------------------------
// 1. Featured Next Match Highlight Card (Matches Football design)
// ---------------------------------------------------------------------------

export interface FeaturedFixtureProps {
  startsAt: string;
  formatBadge: string;
  title: string;
  subtitle?: string | null;
  dateText: string;
  venueText?: string | null;
  lineupText?: string;
  rsvpText?: string;
  onLineup?: () => void;
  onRsvp: () => void;
}

export function FeaturedFixtureCard({
  startsAt,
  formatBadge,
  title,
  subtitle,
  dateText,
  venueText,
  lineupText = 'Tactical Lineup',
  rsvpText = 'RSVP & Details',
  onLineup,
  onRsvp,
}: FeaturedFixtureProps) {
  const countdown = formatCountdownText(startsAt);

  return (
    <Card className="border-primary/40 bg-gradient-to-r from-surface via-surface to-primary/5 shadow-card overflow-hidden">
      <div className="h-1 bg-primary w-full" />
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Next Fixture • {countdown}
              </span>
              <Badge variant="outline" className="border-border text-[10px] text-muted-foreground font-mono">
                {formatBadge}
              </Badge>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-foreground truncate">
                {title}
              </h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                {subtitle && (
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span>{subtitle}</span>
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{dateText}</span>
                </span>
                {venueText && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{venueText}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            {onLineup && (
              <Button
                variant="outline"
                size="sm"
                onClick={onLineup}
                className="border-primary/40 text-primary hover:bg-primary/10 text-xs font-bold flex-1 sm:flex-initial justify-center"
              >
                <Trophy className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                <span>{lineupText}</span>
              </Button>
            )}
            <Button
              size="sm"
              onClick={onRsvp}
              className="bg-primary text-primary-foreground hover:bg-primary-hover text-xs font-bold shadow-sm flex-1 sm:flex-initial justify-center"
            >
              <span>{rsvpText}</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1.5 shrink-0" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 2. Fixture Status Tabs (Upcoming / Live / Past)
// ---------------------------------------------------------------------------

export interface MatchStatusTabsProps {
  activeTab: 'upcoming' | 'live' | 'past';
  onTabChange: (tab: 'upcoming' | 'live' | 'past') => void;
  upcomingCount: number;
  liveCount: number;
  pastCount: number;
}

export function MatchStatusTabs({
  activeTab,
  onTabChange,
  upcomingCount,
  liveCount,
  pastCount,
}: MatchStatusTabsProps) {
  return (
    <div className="border-b border-border overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-4 sm:gap-6 min-w-max">
        <button
          type="button"
          onClick={() => onTabChange('upcoming')}
          className={`flex items-center gap-1.5 sm:gap-2 pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'upcoming'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="sm:hidden">Upcoming</span>
          <span className="hidden sm:inline">Upcoming Fixtures</span>
          <span className="rounded-full bg-primary/15 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-mono text-primary font-bold">
            {upcomingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('live')}
          className={`flex items-center gap-1.5 sm:gap-2 pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'live'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="h-4 w-4 shrink-0" />
          <span className="sm:hidden">Live</span>
          <span className="hidden sm:inline">Live Matches</span>
          {liveCount > 0 && (
            <span className="flex h-2 w-2 rounded-full bg-danger animate-ping" />
          )}
          <span className="rounded-full bg-surface-subtle px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-mono text-foreground font-bold">
            {liveCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('past')}
          className={`flex items-center gap-1.5 sm:gap-2 pb-2.5 sm:pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'past'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="h-4 w-4 shrink-0" />
          <span className="sm:hidden">Past</span>
          <span className="hidden sm:inline">Past Matches</span>
          <span className="rounded-full bg-surface-subtle px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-mono text-muted-foreground font-bold">
            {pastCount}
          </span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Match Card (Standardized 3-column / responsive grid card)
// ---------------------------------------------------------------------------

export interface MatchFixtureCardProps {
  formatBadge: string;
  status: string;
  title: string;
  subtitle?: string | null;
  dateText: string;
  venueText?: string | null;
  playingCount: number;
  capacity: number;
  lineupText?: string;
  rsvpText?: string;
  onLineup?: () => void;
  onRsvp: () => void;
}

export function MatchFixtureCard({
  formatBadge,
  status,
  title,
  subtitle,
  dateText,
  venueText,
  playingCount,
  capacity,
  lineupText = 'Lineup',
  rsvpText = 'RSVP',
  onLineup,
  onRsvp,
}: MatchFixtureCardProps) {
  const isFull = playingCount >= capacity;
  const pct = capacity > 0 ? Math.min(100, (playingCount / capacity) * 100) : 0;

  return (
    <Card className="group border-border bg-surface hover:border-primary/50 transition-all duration-200 shadow-card flex flex-col justify-between">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <Badge variant="outline" className="border-border text-[10px] font-mono text-muted-foreground">
            {formatBadge}
          </Badge>
          <StatusBadge status={status} />
        </div>
        <CardTitle className="text-base font-extrabold text-foreground group-hover:text-primary transition-colors truncate">
          {title}
        </CardTitle>
        {subtitle && (
          <p className="text-xs font-medium text-primary flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{subtitle}</span>
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-3 pb-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{dateText}</span>
          </div>
          {venueText && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{venueText}</span>
            </div>
          )}

          {/* Attendance Turnout Indicator */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                Attendance:
              </span>
              <span className={`font-bold font-mono ${isFull ? 'text-primary' : 'text-foreground'}`}>
                {playingCount}/{capacity} Confirmed
              </span>
            </div>
            <div className="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isFull ? 'bg-primary' : 'bg-primary/70'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card Action Buttons */}
        <div className={`grid ${onLineup ? 'grid-cols-2' : 'grid-cols-1'} gap-2 pt-2 border-t border-border/60`}>
          {onLineup && (
            <Button
              variant="outline"
              size="sm"
              onClick={onLineup}
              className="w-full text-xs font-bold border-border text-foreground hover:bg-surface-subtle h-8 px-2"
            >
              <Trophy className="h-3.5 w-3.5 mr-1 text-primary" />
              <span>{lineupText}</span>
            </Button>
          )}
          <Button
            size="sm"
            onClick={onRsvp}
            className="w-full text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-hover h-8 px-2 shadow-sm"
          >
            <span>{rsvpText}</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
