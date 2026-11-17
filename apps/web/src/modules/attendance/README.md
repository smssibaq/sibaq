# Attendance Module — Developer C

**Developer Ownership**: Developer C (`feature/c-matches`)

## Responsibilities
- Player attendance RSVP (`playing`, `maybe`, `not_playing`)
- Server-authenticated attendance mutation (`set_attendance` RPC)
- Headcount breakdown and quorum progress bar (`AttendanceSummary`)
- Interactive one-tap RSVP buttons with loading states (`AttendanceButton`)
- Categorized player RSVP list with avatars and preferred football positions (`AttendanceList`)
- Composite attendee panel (`AttendancePanel`)
- Supabase Postgres Changes realtime channel (`useAttendanceRealtime`) with TanStack Query invalidation
- Enforcement: &quot;Maybe&quot; responses are tentative and NOT counted toward confirmed headcount

## Authenticated RPCs Owned
- `set_attendance(p_match: uuid, p_status: text) -> void`

## Query Keys
- `queryKeys.matches.attendance(matchId)`: `['matches', matchId, 'attendance']`
- `['matches', matchId, 'my-attendance']`: current authenticated user's RSVP status
