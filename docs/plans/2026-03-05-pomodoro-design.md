# Pomodoro App — Design Document

**Date:** 2026-03-05
**Status:** Approved

## Overview

A multi-user Pomodoro timer app with tiered focus modes, project-based session tracking, GitHub integration for project discovery, and a daily log for standup reference. Local-first development, VPS deployment when ready.

## Tech Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Auth:** Auth.js (NextAuth v5) with GitHub OAuth
- **Database:** PostgreSQL + Drizzle ORM
- **Styling:** Tailwind CSS
- **Deployment:** `next start` behind nginx/caddy on VPS

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| File names | dash-case | `focus-session.ts` |
| Variables & functions | camelCase | `focusMode`, `getProjects()` |
| Classes & interfaces | PascalCase | `FocusSession`, `ProjectService` |
| DB fields & tables | snake_case | `focus_sessions`, `created_at` |

## Data Model

### Auth tables (managed by Auth.js)

- `users` — id, name, email, image, created_at
- `accounts` — Auth.js managed table for OAuth providers
- `sessions` — Auth.js managed table for user sessions

### Core domain tables

**`projects`**
- id (uuid, PK)
- user_id (FK → users)
- name (varchar 100, required, unique per user)
- description (text, nullable)
- github_repo_url (text, nullable)
- github_owner (varchar, nullable)
- github_repo_name (varchar, nullable)
- color (varchar 7, hex color)
- created_at (timestamp)
- updated_at (timestamp)

**`focus_sessions`**
- id (uuid, PK)
- user_id (FK → users)
- project_id (FK → projects)
- focus_mode (enum: `short` | `average` | `deep`)
- task (text, required, 1-500 chars)
- started_at (timestamp)
- completed_at (timestamp, nullable)
- duration_seconds (integer)
- status (enum: `completed` | `interrupted` | `abandoned`)
- created_at (timestamp)

**`github_connections`**
- id (uuid, PK)
- user_id (FK → users)
- label (varchar 50, required — e.g. "personal", "work")
- github_username (varchar)
- access_token (text, encrypted)
- created_at (timestamp)

### Focus mode durations

| Mode | Work | Break |
|------|------|-------|
| Short Focus | 25 min | 5 min |
| Average Focus | 50 min | 10 min |
| Deep Focus | 90 min | 20 min |

### Relationships

- A user has many projects, many focus sessions, and many GitHub connections
- A focus session belongs to exactly one project and requires a task description
- Projects can optionally be linked to a GitHub repo (from any connection)

## Application Structure

```
src/
├── app/
│   ├── layout.tsx                  # root layout, dark theme, auth provider
│   ├── page.tsx                    # landing / redirect to dashboard
│   ├── (auth)/
│   │   ├── sign-in/page.tsx        # sign-in page (GitHub OAuth buttons)
│   │   └── sign-up/page.tsx        # sign-up (same OAuth flow)
│   ├── (app)/                      # authenticated layout group
│   │   ├── layout.tsx              # sidebar nav, user menu
│   │   ├── timer/page.tsx          # main timer view (default after login)
│   │   ├── log/page.tsx            # daily log — sessions grouped by date
│   │   ├── projects/
│   │   │   ├── page.tsx            # project list
│   │   │   └── [id]/page.tsx       # project detail + session history
│   │   └── settings/
│   │       └── page.tsx            # GitHub connections, preferences
├── components/
│   ├── ui/                         # base UI primitives (button, card, input, etc.)
│   ├── timer/                      # timer ring, controls, mode selector
│   ├── session/                    # session card, session list
│   ├── project/                    # project card, project selector
│   └── layout/                     # sidebar, nav, user-menu
├── lib/
│   ├── db/
│   │   ├── schema.ts               # Drizzle schema definitions
│   │   ├── index.ts                # db connection
│   │   └── migrations/             # Drizzle migrations
│   ├── auth.ts                     # Auth.js config
│   ├── github.ts                   # GitHub API client
│   └── utils.ts                    # shared utilities
├── actions/                        # server actions
│   ├── session-actions.ts
│   ├── project-actions.ts
│   └── github-actions.ts
└── types/                          # shared TypeScript types
    └── index.ts
```

## Core Flows

### Flow 1: Starting a Focus Session

1. User lands on `/timer` — sees the timer ring in the center
2. Select project from dropdown (required) — recent projects shown first
3. Write task in text input (required) — e.g. "Fix auth redirect bug"
4. Pick focus mode — three buttons: Short (25m) / Average (50m) / Deep (90m)
5. Start — timer begins counting down, UI shifts to immersive focus state:
   - Sidebar collapses or dims
   - Timer ring dominates viewport with subtle pulse animation
   - Current task and project shown beneath the timer
   - Only two actions: Pause and Abandon
6. On completion — satisfying completion animation, session auto-saved as `completed`
7. Break starts automatically — proportional break timer appears
8. After break — returns to timer page ready for next session

### Flow 2: Interruption Handling

- Pause stops the timer, shows elapsed vs remaining. Resume continues.
- Abandon marks session as `abandoned`, saves partial duration. Asks for confirmation.
- Navigating away mid-session: timer persists in client state, banner reminds on other pages.

### Flow 3: Daily Log

- Default view: today's sessions, grouped chronologically
- Each session card: project (color dot), task description, focus mode badge, duration, status
- Date picker to browse previous days
- Filter by project
- Summary at top: total focus time, session count, breakdown by mode

### Flow 4: Project Management

- Create project manually (name, description, optional color)
- Import from GitHub: pick a connection, browse repos, select — auto-fills name and sets repo URL
- Project detail page shows session history for that project

### Flow 5: GitHub Connection

- In settings, click "Connect GitHub Account"
- User provides a label (free text: "personal", "work", etc.)
- OAuth flow redirects to GitHub, grants repo read access
- Connection saved with GitHub username and token
- No limit on number of connections, can disconnect any time

## UI Design Direction

### Aesthetic: Dark Minimal Premium

- **Background:** Near-black (`#0A0A0B`) with subtle noise texture
- **Surfaces:** Dark gray cards (`#141416`) with 1px borders (`#1F1F23`)
- **Text:** Off-white primary (`#EDEDEF`), muted secondary (`#71717A`)
- **Accent:** Cool white-blue (`#A0A0FF`) — active states, timer ring, CTAs. No gradients.
- **Project colors:** User-chosen color dots, overall palette stays monochrome

### Typography

- **Display/headings:** Instrument Serif — editorial, distinctive
- **Body/UI:** Geist Sans — clean, modern
- **Monospace (timer digits):** Geist Mono — sharp, precise, hero element

### The Timer (hero component)

- Large circular SVG ring with smooth stroke-dashoffset animation
- Timer digits centered in Geist Mono, 48-64px
- Ring stroke color subtly shifts as time progresses
- Completion: radial pulse animation, ring fills momentarily
- Minimal chrome — timer breathes in whitespace

### Layout

- Narrow sidebar (icon-based, expands on hover with labels)
- Main content centered, max-width ~720px for timer, ~960px for log/projects
- Every element earns its space

### Micro-interactions

- Mode selector: subtle scale + background transition on hover
- Session cards: soft fade-in, staggered for lists
- Page transitions: gentle crossfade
- Status badges: pill-shaped, muted backgrounds

## Error Handling & Edge Cases

### Timer Resilience

- Timer state in `localStorage` — survives refreshes and tab closes
- On return with active timer: if within duration, resume with corrected time. If past, mark `completed` with "finished while away" message.
- `beforeunload` warning when session is active

### Auth Edge Cases

- GitHub token expiry: on API failure, prompt re-authentication for that connection
- Removed connection: linked projects keep repo URL but lose live API access
- Multi-user: all data isolated by `user_id` on every query

### Session Integrity

- `started_at` set server-side to prevent clock manipulation
- `completed_at` and `duration_seconds` validated server-side with reasonable tolerance
- One active session per user — starting another prompts to abandon current

### Network Failures

- Session start/complete actions retry on failure (optimistic UI + server confirmation)
- GitHub repo fetching: loading/error states per connection independently
- All server actions return typed result objects (success/error)

### Data Validation

- Task description: required, 1-500 characters
- Project name: required, 1-100 characters, unique per user
- GitHub connection label: required, 1-50 characters
