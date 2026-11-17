import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/dates';
import { Check, HelpCircle, X, Users, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import type { MatchAttendance, AttendanceStatus, MatchWaitlistEntry } from './types';

export interface AttendanceListProps {
  attendees: MatchAttendance[];
  waitlist?: MatchWaitlistEntry[];
  isLoading?: boolean;
  className?: string;
}

export function AttendanceList({
  attendees,
  waitlist = [],
  isLoading: _isLoading = false,
  className,
}: AttendanceListProps) {
  const [activeTab, setActiveTab] = useState<AttendanceStatus | 'waitlist'>('playing');

  const playing = attendees.filter((a) => a.status === 'playing');
  const maybe = attendees.filter((a) => a.status === 'maybe');
  const notPlaying = attendees.filter((a) => a.status === 'not_playing');

  const getPositionBadge = (pos?: string | null) => {
    if (!pos) return null;
    const colors: Record<string, string> = {
      GK: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      DEF: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      MID: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      ATT: 'bg-red-500/20 text-red-300 border-red-500/40',
    };
    return (
      <span
        className={clsx(
          'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border',
          colors[pos] || 'bg-surface-subtle text-muted-foreground'
        )}
      >
        {pos}
      </span>
    );
  };

  return (
    <div className={clsx('space-y-4 rounded-xl border border-border bg-surface p-5 shadow-card', className)}>
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span>Player Availability Roster</span>
        </h4>
        <span className="text-xs text-muted-foreground">
          {attendees.length + waitlist.length} total participants
        </span>
      </div>

      {/* Tabs for RSVP Status */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('playing')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
            activeTab === 'playing'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
          )}
        >
          <Check className="h-3.5 w-3.5" />
          <span>Playing ({playing.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('maybe')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
            activeTab === 'maybe'
              ? 'bg-warning text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
          )}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Maybe ({maybe.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('not_playing')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
            activeTab === 'not_playing'
              ? 'bg-danger text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
          )}
        >
          <X className="h-3.5 w-3.5" />
          <span>Out ({notPlaying.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('waitlist')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
            activeTab === 'waitlist'
              ? 'bg-primary/20 text-primary border border-primary/40 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Waitlist ({waitlist.length})</span>
        </button>
      </div>

      {/* Respondent List */}
      {activeTab === 'waitlist' ? (
        waitlist.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No players currently on the waitlist. Capacity is available!
          </div>
        ) : (
          <div className="divide-y divide-border/40 max-h-80 overflow-y-auto pr-1">
            {waitlist.map((w) => {
              const name = w.profile?.displayName || 'Turf Player';
              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between py-2.5 px-1 hover:bg-surface-subtle/40 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={w.profile?.avatarUrl || undefined}
                      fallback={name}
                      className="h-8 w-8 text-xs font-bold border border-primary/30"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{name}</span>
                        {getPositionBadge(w.profile?.preferredPosition)}
                      </div>
                      {w.createdAt && (
                        <span className="text-[11px] text-muted-foreground block">
                          Joined waitlist {formatRelativeTime(w.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Badge variant="warning" className="text-xs font-bold font-mono">
                      #{w.queuePosition} in Queue
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        (() => {
          const list =
            activeTab === 'playing' ? playing : activeTab === 'maybe' ? maybe : notPlaying;
          if (list.length === 0) {
            return (
              <div className="py-8 text-center text-xs text-muted-foreground">
                {activeTab === 'playing' && "No players confirmed yet. Be the first to Availability Playing!"}
                {activeTab === 'maybe' && 'No players in the Maybe category.'}
                {activeTab === 'not_playing' && 'No players have marked themselves Out.'}
              </div>
            );
          }

          return (
            <div className="divide-y divide-border/40 max-h-80 overflow-y-auto pr-1">
              {list.map((att) => {
                const name = att.profile?.displayName || 'Turf Player';
                return (
                  <div
                    key={att.userId}
                    className="flex items-center justify-between py-2.5 px-1 hover:bg-surface-subtle/40 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={att.profile?.avatarUrl || undefined}
                        fallback={name}
                        className="h-8 w-8 text-xs font-bold"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{name}</span>
                          {getPositionBadge(att.profile?.preferredPosition)}
                        </div>
                        {att.updatedAt && (
                          <span className="text-[11px] text-muted-foreground block">
                            Responded {formatRelativeTime(att.updatedAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {att.status === 'playing' && (
                        <Badge variant="success" className="text-[11px] font-semibold">
                          Confirmed
                        </Badge>
                      )}
                      {att.status === 'maybe' && (
                        <Badge variant="warning" className="text-[11px] font-semibold">
                          Tentative
                        </Badge>
                      )}
                      {att.status === 'not_playing' && (
                        <Badge variant="danger" className="text-[11px] font-semibold">
                          Unavailable
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()
      )}
    </div>
  );
}
