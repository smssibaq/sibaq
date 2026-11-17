# Project Plan Template (Stage 2)

> Fill out this document with your 3-person team immediately upon receiving the competition problem statement. Once completed, pass this document to ONE developer to execute the `MASTER_PROMPT.md`.

---

## 1. Problem Statement & Users
- **Problem Statement**: [Paste exact competition problem statement here]
- **Target Users**: [Who experiences this problem? e.g. Freelancers, Clinic staff, Commuters]
- **Proposed Solution**: [1-2 paragraphs describing your original solution]
- **Core User Journey**: [Step-by-step description of the single most important journey from landing to final outcome]

---

## 2. Scope & Boundaries
- **In-Scope (MVP)**:
  - Feature A: [Summary]
  - Feature B: [Summary]
  - Feature C: [Summary]
- **Explicitly Excluded Scope**: [What will NOT be built to ensure the 240-minute deadline is met]

---

## 3. Team Ownership
- **Developer A**:
  - Feature: `Feature A — <Name>`
  - Module folder: `apps/web/src/modules/<feature-a>/`
  - Routes: `/<route-a>`
  - Tables: `public.<table_a>`
- **Developer B**:
  - Feature: `Feature B — <Name>`
  - Module folder: `apps/web/src/modules/<feature-b>/`
  - Routes: `/<route-b>`
  - Tables: `public.<table_b>`
- **Developer C**:
  - Feature: `Feature C — <Name>`
  - Module folder: `apps/web/src/modules/<feature-c>/`
  - Routes: `/<route-c>`
  - Tables: `public.<table_c>`
- **Integration Lead**: [Developer Name] (responsible for coordinating root router & reviewing PRs)

---

## 4. Domain Entities & Database Architecture
```text
Table 1: <table_a>
  - id uuid primary key default gen_random_uuid()
  - owner_id uuid references auth.users(id)
  - [field1 type]
  - [field2 type]
  - created_at timestamptz default now()

Table 2: <table_b>
  - id uuid primary key default gen_random_uuid()
  - [foreign keys]
  - ...
```

### Authorization & RLS Rules
- `<table_a>`: [Who can read? Who can write? e.g. Owner only, or public read + authenticated create]
- `<table_b>`: [Who can read? Who can write?]
- `<table_c>`: [Who can read? Who can write?]

### Storage Requirements
- Bucket: [`user-files` or new bucket]
- Object path: `[<user_id>/<feature>/*]`
- Max file size & MIME: [e.g. 5MB, images/pdf]

---

## 5. Feature Contracts & Dependencies
- What does Feature B require from Feature A? [e.g. Reads `table_a.id` via public query hook]
- What does Feature C require from Feature B? [e.g. Shared status badge or notification]

---

## 6. Branding & Visual Tokens
- Product Name: [e.g. HealthBridge]
- Tagline: [e.g. Seamless triage and clinical workflow]
- Accent Color: [Default `#4F46E5`, or custom hex]
- Key visual metaphor: [e.g. Medical cross, Shield, Rocket]

---

## 7. Demo Storyline (10-Minute Presentation)
1. **0:00 - 2:00**: Hook & Problem Validation (Landing page hero).
2. **2:00 - 4:00**: Sign in via Google OAuth, view dashboard metrics.
3. **4:00 - 6:00**: Feature A in action (Core workflow creation).
4. **6:00 - 8:00**: Feature B & Feature C in action (Interactions, status transitions, storage).
5. **8:00 - 10:00**: Summary, architecture robustness, Q&A.

