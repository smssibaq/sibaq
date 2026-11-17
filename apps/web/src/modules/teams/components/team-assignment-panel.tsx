import { useState } from 'react';
import type { Team, MatchAttendance, PitchCoordinate } from '../types';
import { useFormationStore } from '../store/use-formation-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Plus, CheckCircle } from 'lucide-react';

export interface TeamAssignmentPanelProps {
  teams: Team[];
  confirmedAttendance: MatchAttendance[];
  onAssignPlayer: (
    teamId: string,
    userId: string,
    position?: string,
    isSubstitute?: boolean,
    coordinate?: PitchCoordinate | null
  ) => void;
  isAssigning?: boolean;
  isReadOnly?: boolean;
}

export function TeamAssignmentPanel({
  teams,
  confirmedAttendance,
  onAssignPlayer,
  isAssigning = false,
  isReadOnly = false,
}: TeamAssignmentPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const draftPlayers = useFormationStore((s) => s.draftPlayers);
  const teamDrafts = useFormationStore((s) => s.teamDrafts);

  // Collect all user IDs assigned across all teams (server records + active local drafts)
  const assignedUserIds = new Set<string>();
  teams.forEach((t) => {
    (t.players || []).forEach((p) => assignedUserIds.add(p.userId));
  });
  draftPlayers.forEach((p) => assignedUserIds.add(p.userId));
  Object.values(teamDrafts).forEach((td) => {
    td.draftPlayers.forEach((p) => assignedUserIds.add(p.userId));
  });

  // Filter unassigned confirmed attendees
  const unassigned = confirmedAttendance.filter((att) => !assignedUserIds.has(att.userId));

  // Search filter
  const filteredUnassigned = unassigned.filter((att) => {
    const name = att.profile?.displayName || 'Player';
    const pos = att.profile?.preferredPosition || '';
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) || pos.toLowerCase().includes(query);
  });

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col gap-2.5 pb-3 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="h-4 w-4 text-primary shrink-0" />
            <h3 className="text-sm font-bold text-foreground truncate">
              Confirmed Match Attendees ({confirmedAttendance.length})
            </h3>
          </div>
          <Badge variant="secondary" className="text-[10px] bg-secondary text-primary border border-border shrink-0 font-mono px-2 py-0.5">
            {unassigned.length} Unassigned
          </Badge>
        </div>

        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search attendees by name or position..."
            className="w-full h-8 pl-8 text-xs bg-surface-subtle border-border text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Unassigned Pool Grid */}
      {filteredUnassigned.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg bg-surface-subtle/40">
          {assignedUserIds.size > 0 && unassigned.length === 0 ? (
            <>
              <CheckCircle className="h-5 w-5 text-success mx-auto mb-1.5" />
              <p className="font-semibold text-foreground">All Confirmed Players Assigned</p>
              <p className="text-[11px] mt-0.5">
                Every confirmed attendee is assigned to a match team.
              </p>
            </>
          ) : confirmedAttendance.length === 0 ? (
            <>
              <Users className="h-5 w-5 text-primary mx-auto mb-1.5" />
              <p className="font-semibold text-foreground">No Squad Members Found</p>
              <p className="text-[11px] mt-0.5">
                Add active members to your squad or collect match RSVPs to populate the pool.
              </p>
            </>
          ) : (
            <>
              <Search className="h-5 w-5 text-muted-foreground mx-auto mb-1.5" />
              <p className="font-semibold text-foreground">No Matching Players</p>
              <p className="text-[11px] mt-0.5">
                No unassigned players matched your search query.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 max-h-80 overflow-y-auto pr-1">
          {filteredUnassigned.map((att) => {
            const name =
              att.profile?.displayName ||
              `Player (${att.userId.slice(0, 4)})`;
            const prefPos = att.profile?.preferredPosition || 'MID';
            const initials = name
              .replace(/[^a-zA-Z0-9 ]/g, '')
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join('') || 'P';

            return (
              <div
                key={att.userId}
                className="flex flex-col p-3 rounded-lg border border-border bg-surface-subtle/60 hover:bg-surface-subtle transition-colors gap-2.5"
              >
                {/* Top Row: Avatar + Full Name + Status / Position */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface border border-border text-xs font-bold text-foreground">
                      {att.profile?.avatarUrl ? (
                        <img
                          src={att.profile.avatarUrl}
                          alt={name}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{name}</p>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Confirmed Attendee
                      </span>
                    </div>
                  </div>

                  <Badge variant="outline" className="text-[9px] px-2 py-0.5 border-border text-primary font-bold shrink-0 font-mono">
                    {prefPos}
                  </Badge>
                </div>

                {/* Bottom Row: Full-width + Team quick assign buttons (assigns as substitute with null coordinates) */}
                {!isReadOnly && (
                  <div className="flex items-center gap-2 w-full pt-1.5 border-t border-border/60">
                    {teams.map((team) => (
                      <Button
                        key={team.id}
                        type="button"
                        size="sm"
                        disabled={isAssigning}
                        onClick={() => onAssignPlayer(team.id, att.userId, 'SUB', true, null)}
                        className="flex-1 h-8 text-xs font-bold bg-surface hover:bg-surface-subtle text-foreground border border-border shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1 text-primary" />
                        <span>+ {team.name}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
