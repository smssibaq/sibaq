import { Avatar, Card } from '@/components/ui';
import type { VolleyballAttendance, VolleyballPlayer } from '@/types/sports/volleyball.db';

const GROUPS: { status: VolleyballAttendance; label: string }[] = [
  { status: 'playing', label: 'Confirmed' },
  { status: 'maybe', label: 'Maybe' },
  { status: 'not_playing', label: 'Not playing' },
];

export function VolleyballPlayerList({ players, currentUserId }: { players: VolleyballPlayer[]; currentUserId?: string }) {
  return (
    <Card className="p-4 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Players</h2>
      {GROUPS.map(({ status, label }) => {
        const group = players.filter((p) => p.attendance_status === status);
        if (group.length === 0) return null;
        return (
          <div key={status} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {label} ({group.length})
            </p>
            <ul className="space-y-1.5">
              {group.map((p) => (
                <li key={p.user_id} className="flex items-center gap-2.5 min-w-0">
                  <Avatar src={p.avatar_url} fallback={p.name} size="sm" />
                  <span className="text-sm text-foreground truncate">
                    {p.name}
                    {p.user_id === currentUserId && <span className="text-muted-foreground"> (you)</span>}
                  </span>
                  {p.team_side && (
                    <span className="ml-auto shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-primary">
                      Team {p.team_side}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {players.length === 0 && <p className="text-sm text-muted-foreground">No one has joined yet.</p>}
    </Card>
  );
}
