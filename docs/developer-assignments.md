# Turf XI — Developer Assignment Matrix & Sprint Backlog

## Developer A (Squad & Community Lead)
- [ ] Task A.1: Finalize squad creation flow with custom turf logo/avatar upload to Supabase storage bucket `avatars`.
- [ ] Task A.2: Implement 6-character room code generator validation and copy-to-clipboard toast.
- [ ] Task A.3: Build member approval modal for squad admins to accept pending members.
- [ ] Task A.4: Implement squad owner transfer modal with confirmation guard.
- [ ] Task A.5: Build 7-day token-based invitation link generator and expiration countdown.

## Developer B (Tactical Board & Lineup Lead)
- [ ] Task B.1: Implement pointer/touch drag-and-drop on the pitch board container calculating normalized `(x, y)` between `0.0` and `1.0`.
- [ ] Task B.2: Implement formation preset selector (`2-3-1`, `3-2-1`, `1-2-1`, `2-1-2`) that auto-snaps player positions.
- [ ] Task B.3: Implement substitute bench tray allowing swapping players between starting XI and bench.
- [ ] Task B.4: Handle optimistic locking revision check: detect `P0003` revision conflict and prompt user to reload newest formation.
- [ ] Task B.5: Wire live Supabase Realtime channel to update teammates' pitch boards when formation is saved.

## Developer C (Match Fixtures & Attendance Lead)
- [ ] Task C.1: Build match scheduling form with Kerala turf preset list (e.g., Decathlon Turf, United Turf Arena, Kickoff Turf).
- [ ] Task C.2: Format kickoff and countdown timers in `Asia/Kolkata` IST timezone using `date-fns`.
- [ ] Task C.3: Support single team practice mode vs two-team friendly derby mode with automated Team A and Team B generation.
- [ ] Task C.4: Build interactive RSVP buttons (`Playing`, `Maybe`, `Out`) with live player counts and instant RPC mutations.
- [ ] Task C.5: Integrate realtime attendance subscriptions to reflect attendance changes across all viewers instantly.
