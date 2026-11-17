# Invitations & Joining Module — Turf XI (Developer A)

## Overview
This module governs squad onboarding workflows via 16-character room codes and 7-day shareable invitation links.

## Routes
- `/join` — Room code joining interface. Supports 16-character hexadecimal codes, clipboard pasting, automated uppercase normalization, live character counting, unauthenticated handling, pending approval feedback, and already-joined redirects.
- `/invite/$token` — 7-day shareable token landing page. Displays invitation status, Google authentication redirect if unauthenticated, and accepts invitations via verified RPC.

## Backend RPCs Used
- `join_squad(p_code text)`: Evaluates 16-character room code, validates user authentication, and joins squad.
- `create_squad_invite(p_squad uuid)`: Generates a raw token, hashes with SHA-256 for storage, and returns raw token for URL generation.
- `join_squad_by_invite(p_token text)`: Hashes provided token, matches against active non-expired records, and joins squad.
- `revoke_squad_invite(p_invite uuid)`: Sets `revoked_at` timestamp.
