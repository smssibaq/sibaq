# Turf XI — Product Specification (MVP)

**Tagline:** Create Your Squad. Build Your XI. Own the Turf.  
**Target Users:** Kerala turf football players, friend groups, amateur weekend teams, and local football communities.

---

## 1. Vision & Core Philosophy

Turf football in Kerala is an intense, weekly ritual. Friend groups coordinate 5v5 to 11v11 matches across hundreds of commercial turf pitches. Currently, planning happens through chaotic WhatsApp threads with lost headcount, ambiguous positions, and arguments over team balance.

**Turf XI** replaces the chaos with a dedicated, mobile-first squad and match operations hub:
- **Permanent Squads:** Squads are persistent clubs, not single-use match chats. A squad hosts many matches over time.
- **Single or Derby Modes:** Support internal single squad scrimmages or two-team friendly derbies with live rosters.
- **Attendance & Lock-in:** Players RSVP directly (`playing`, `maybe`, `not_playing`).
- **Tactical Pitch Board:** Visual, real-time formation builder with normalized `[0,1]` coordinates, presets (e.g., 2-3-1, 3-2-1), and optimistic revision concurrency.
- **Accessible & Fast:** High-contrast 60/30/10 dark/neon aesthetic, 44px touch targets, full offline resilience with honest backend unavailable state.

---

## 2. Core User Personas

1. **The Squad Captain / Organizer (Owner/Admin):**
   - Creates the squad and shares 6-character room codes or 7-day invite links.
   - Schedules matches with venue, kickoff time (IST), and pitch size.
   - Approves pending requests, manages player roles, or transfers squad ownership.
   - Configures starting lineups, tactical formations, and substitutes.

2. **The Turf Regular / Player (Member):**
   - Joins via room code or secure invitation token.
   - Updates match attendance with one tap.
   - Views team assignments, colors, and live lineup boards on match day.
   - Sets preferred football position (GK, DEF, MID, ATT) on their profile.

---

## 3. Scope & Feature Boundaries (MVP)

### In Scope (MVP)
- Squad creation, room codes (`join_code`), and time-limited token invitations.
- Squad roster management with Owner, Admin, and Player role hierarchy.
- Match scheduling (5v5 to 11v11), IST timezone support (`Asia/Kolkata`), single vs friendly derby mode.
- One-tap RSVP attendance with live headcount tallies.
- Lineup assignment and interactive pitch formation builder.
- Realtime lineup and attendance updates via Supabase Realtime postgres changes.
- Safe profile creation fallback for Google OAuth accounts.

### Out of Scope (Post-MVP)
- Payment splitting / UPI payment gateway integrations.
- In-app video streaming or media uploads.
- Complex league tournament bracket engines (MVP focus is casual & friendly turf matches).
- Global social networks or public search engines outside squad memberships.

---

## 4. Design Guidelines & Theme Tokens

- **Dominant Canvas (60%):** Deep Midnight Green `#0B1F19`
- **Container / Stadium Surface (30%):** Rich Stadium Green `#132E26`, Border `#234E42`
- **Accent / Interactive (10%):** Electric Neon Lime `#B7F34B`
- **Text on Accent:** Deep Charcoal `#0B1F19` (strictly enforced for accessibility)
- **Typography:** Poppins across headings and UI controls.
- **Target Touch Area:** Minimum 44x44px touch areas on mobile devices.
