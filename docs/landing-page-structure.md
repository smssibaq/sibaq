# Kalikkanundo — Landing Page Complete Architecture & Structure

> **Application**: `apps/landing`  
> **Framework**: Next.js 14 (App Router), React, Tailwind CSS, Lucide Icons  
> **Visual Language**: Kerala Turf Dark Forest Palette (`#0B1F19`, `#142D25`, `#B7F34B`, `#F5F7F4`, `#294237`)  
> **Typography**: Poppins font family  

---

## 1. Page Layout Hierarchy

The landing page is composed as a single-page marketing showcase inside `apps/landing/src/app/page.tsx`:

```mermaid
graph TD
    Page[HomePage (app/page.tsx)]
    Page --> Navbar[1. Navbar]
    Page --> Hero[2. Hero Section]
    Page --> Features[3. Core Features Section]
    Page --> Formation[4. Interactive Formation Showcase]
    Page --> HowItWorks[5. How It Works - 3 Steps]
    Page --> MatchShowcase[6. Match Coordination Showcase]
    Page --> KeralaTurf[7. Kerala Turf Community Section]
    Page --> CtaSection[8. Final CTA Section]
    Page --> Footer[9. Footer & Brand Monument]
```

---

## 2. Section-by-Section Structural Breakdown

### Section 1: Sticky Navigation Bar (`Navbar.tsx`)
- **Container**: `sticky top-0 z-50 w-full border-b border-border bg-surface/95 backdrop-blur-md`
- **Left**:
  - `BrandLogo`: Kalikkanundo emblem + wordmark (`href="/"`, size `md`).
- **Center (Desktop)**:
  - Links: `Features` (`#features`), `How It Works` (`#how-it-works`), `Formation Builder` (`#formations`), `Why Kalikkanundo` (`#why-kalikkanundo`).
- **Right (Desktop)**:
  - Secondary Button: **Sign In** (`${appUrl}/login`)
  - Primary Button: **Get Started** (`${appUrl}/login?returnUrl=/squads/new`)
- **Mobile Drawer**:
  - Animated Hamburger/Close toggle with full dropdown navigation menu.

---

### Section 2: Hero Section (`Hero.tsx`)
- **Background**: Ambient pitch grid glow (`radial-gradient` lime accent `#B7F34B`).
- **Left Column (Headline & Value Prop)**:
  - **Pill Badge**: "Built for Kerala Turf Football" with logo emblem.
  - **Main Headline**: `Kalikkanundo? Game On!` in bold uppercase typography.
  - **Value Proposition Card**: *"No more endless WhatsApp messages: Organize squads, lineups, and match attendance in one platform."*
  - **Subtext**: *"Create your squad, invite friends, organize turf matches and build your perfect lineup."*
  - **Action Buttons**:
    - Primary CTA: `Create Your Squad` (linking to `${appUrl}/login?returnUrl=/squads/new`).
    - Secondary CTA: `Explore Features` (`#features`).
  - **Trust Metrics**:
    - `5v5, 6v6 & 7v7 Ready`
    - `Instant Room Code Joining`
    - `Real-Time Lineup Sync`
- **Right Column (Interactive Preview)**:
  - Simulated **Squad Identity Card** ("Calicut Blasters FC", Kozhikode).
  - Mini **Tactical Pitch Board** rendering a 7v7 formation with active player tokens (GK, LB, RB, CM, LM, RM, ST).
  - Live **Upcoming Match Status**: "Friday 8:30 PM • 6v6 Friendly" at Decathlon Arena, Kalamassery (12/12 Confirmed).

---

### Section 3: Core Capabilities & Features (`Features.tsx`)
- **ID Anchor**: `#features`
- **Badge**: `Core Capabilities` with sparkles icon.
- **Headline**: `Everything Your Turf Squad Needs. One Platform.`
- **6-Card Responsive Feature Grid**:
  1. **Create Squads**: Build a permanent football group with friends and assign squad roles.
  2. **Invite Players**: Invite teammates using shareable links and private 16-character room codes.
  3. **Manage Matches**: Plan friendlies, practice sessions, and fixtures at local turfs.
  4. **Build Formations**: Starting lineup pitch supporting 5v5 to 7v7 formats.
  5. **Track Availability**: Transparent Playing, Maybe, and Out attendance tracking.
  6. **Manage Your Team**: Assign positions and split Team A vs Team B friendlies.

---

### Section 4: Interactive Tactical Formation Builder (`FormationShowcase.tsx`)
- **ID Anchor**: `#formations`
- **Left Column (Preset Controls)**:
  - Interactive selector buttons switching presets in real-time:
    - **`2-3-1` (Attacking)**: Wide wingers and high pressing striker for standard 7s.
    - **`3-2-1` (Solid Shield)**: Three backline anchors with two pivot midfielders.
    - **`2-2-2` (Balanced Duo)**: Two lines with paired counter-attacking forwards.
  - Formations dynamically update player tokens on the pitch preview.
  - Feature checklist:
    - Drag-and-drop tactical positioning.
    - Automatic single goalkeeper enforcement.
    - Instant starting lineup and substitute synchronization.
- **Right Column (Tactical Pitch)**:
  - Top-down visual turf pitch (boundary lines, center circle, penalty boxes, penalty spots).
  - Position tokens with role badges and player names (Riyas, Afnan, Shammas, Faheem, Jithin, Rahul, etc.).
  - GK highlighted in warning accent with distinct ring.

---

### Section 5: Step-by-Step Workflow (`HowItWorks.tsx`)
- **ID Anchor**: `#how-it-works`
- **Headline**: `From Group Chat to Game Day in 3 Steps.`
- **3-Step Numbered Cards**:
  1. **01. Create Your Squad**: Setup permanent group, assign captain permissions, generate room code.
  2. **02. Invite & Organize**: Share join code via WhatsApp. Teammates join in seconds and confirm RSVPs.
  3. **03. Build Your Team**: Choose starters, test 5v5/7v7 formations on the pitch board, own the turf.

---

### Section 6: Match Coordination & Live Fixture Card (`MatchShowcase.tsx`)
- **Left Column**:
  - Narrative on eliminating confusing chat messages.
  - 3 Pillar Points:
    - **Transparent RSVP Deadlines**: Lock attendance ahead of kickoff.
    - **Team A vs Team B Derby Mode**: Fair splits by position.
    - **Turf Location & IST Kickoff**: Pinned venues and precise schedules.
  - Action link to schedule a match.
- **Right Column**:
  - High-fidelity **Match Fixture Card**:
    - Status: "7v7 Friendly Derby" • "Scheduled (Kickoff in 3d 4h)".
    - Title: "Friday Night Turf Derby" at FIFA Arena, Kakkanad.
    - Headcount Bar: 14/14 Confirmed (Quota Reached).
    - Team A Starting Lineup vs Team B Starting Lineup cards with player position pills.

---

### Section 7: Kerala Turf Community Highlights (`KeralaTurf.tsx`)
- **ID Anchor**: `#why-kalikkanundo`
- **Headline**: `Made for the Way We Play.`
- **4 Feature Cards**:
  1. **Built for WhatsApp**: Frictionless 16-character room codes and one-tap invite links.
  2. **5s, 6s & 7s Support**: Custom configurations from rooftop 5s to expansive Malappuram 7s.
  3. **Mobile-First for Pitch Side**: Zero-lag phone navigation directly under turf floodlights.
  4. **Late Night Kickoffs**: 8:00 PM to midnight IST scheduling with automated quorum confirmation before paying turf booking advances.

---

### Section 8: Call-to-Action Banner (`CtaSection.tsx`)
- **Container**: Elevated card with subtle lime radial glow.
- **Brand Emblem**: Centered Kalikkanundo emblem.
- **Headline**: `Your Next Match Starts Here.`
- **Subtext**: *"Bring your squad together, organize your game, and take control of every match."*
- **Action Buttons**:
  - `Get Started for Free` (Redirects to App Registration).
  - `Explore Features` (Scrolls to `#features`).

---

### Section 9: Site Footer (`Footer.tsx`)
- **5-Column Footer Grid**:
  1. **Brand Identity**: Logo, tagline ("The football squad and match management platform built for Kerala turf players"), and social media links (WhatsApp, Instagram, YouTube, Facebook).
  2. **Navigation**: Features, Formations, How It Works.
  3. **Platform**: Create Squad, Join Squad, Player Profile, My Dashboard.
  4. **Community**: Why Kalikkanundo, Kerala Turf Guide, Squad Rules.
  5. **Quick Kickoff Action**: Action blurb with "Get Started" button.
- **Copyright & Note**: `© 2026 Kalikkanundo. Built for Kerala Turf Football Community.`
- **Brand Monument**: Signature massive typography display `KALIKKANUNDO` across the footer base with vertical metallic gradient.

---

## 3. Configuration & Routing Summary (`site.ts`)

| Config Key | Value | Purpose |
| :--- | :--- | :--- |
| `name` | `"Kalikkanundo"` | Brand name |
| `tagline` | `"Your Game. Your Squad."` | Core slogan |
| `appUrl` | `process.env.NEXT_PUBLIC_APP_URL \|\| 'http://localhost:5173'` | Web application endpoint |
| `navLinks` | `Features`, `How It Works`, `Formation Builder`, `Why Kalikkanundo` | In-page navigation anchors |
| `footer.links` | In-page section references and platform deep-links | Cross-navigation |

