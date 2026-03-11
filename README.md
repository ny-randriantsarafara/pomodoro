# Pomodoro

Focus. Build. Ship.

A task-first Pomodoro timer with guest mode, signed-in session sync, optional project association, GitHub project import, and a daily focus log.

## Features

- **Three focus modes** with proportional breaks:
    - Short Focus: 25 min work / 5 min break
    - Average Focus: 50 min work / 10 min break
    - Deep Focus: 90 min work / 20 min break
- **Task-first tracking** -- start a session quickly, attach it to a task, and optionally add projects for organization
- **Guest mode** -- open `/guest/timer` from the landing page and use the timer locally without creating an account
- **Signed-in active session sync** -- a running signed-in session can be restored and controlled from another signed-in browser
- **Configurable timer settings** -- adjust work, short break, long break, long-break frequency, daily goal, and analytics preferences
- **Daily Log** -- sessions grouped by date with summary stats, for standup reference
- **Task-aware stats** -- review history, streaks, and top tasks over time
- **GitHub Integration** -- connect multiple GitHub accounts via OAuth, import repos as projects
- **Multi-user** -- proper authentication, each user's data fully isolated
- **Timer resilience** -- state persisted in localStorage, survives refreshes and tab closes
- **Dark minimal UI** -- near-black background, subtle noise texture, Instrument Serif headings, Geist Mono timer digits

## Tech Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Framework | Next.js 16 (App Router, Turbopack)      |
| Language  | TypeScript (strict)                     |
| Database  | PostgreSQL 17 + Drizzle ORM             |
| Auth      | Auth.js v5 (NextAuth) with GitHub OAuth |
| Styling   | Tailwind CSS v4                         |
| Testing   | Vitest (unit) + Playwright (E2E)        |

## Prerequisites

- **Node.js** 20 or later
- **Docker** and Docker Compose (for local PostgreSQL)
- **Two GitHub OAuth Apps** (see setup below)

---

## GitHub OAuth Setup

This app requires **two separate GitHub OAuth Apps**: one for user authentication (sign-in), and one for connecting GitHub accounts to import repos as projects.

### OAuth App 1: User Authentication

This is used by Auth.js for signing users in.

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
    - **Application name:** `Pomodoro Auth` (or whatever you want)
    - **Homepage URL:** `http://localhost:3000`
    - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
4. Click **Register application**
5. On the app page, copy the **Client ID**
6. Click **Generate a new client secret**, then copy the **Client Secret**

These go into your `.env.local` as:

```
AUTH_GITHUB_ID=<Client ID from step 5>
AUTH_GITHUB_SECRET=<Client Secret from step 6>
```

### OAuth App 2: GitHub Connections

This is a separate app used for linking GitHub accounts to import repositories as projects. It needs the `repo` scope to read your repos.

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
    - **Application name:** `Pomodoro Connections` (or whatever you want)
    - **Homepage URL:** `http://localhost:3000`
    - **Authorization callback URL:** `http://localhost:3000/api/github/callback`
4. Click **Register application**
5. Copy the **Client ID**
6. Generate and copy the **Client Secret**

These go into your `.env.local` as:

```
GITHUB_CONNECTIONS_CLIENT_ID=<Client ID from step 5>
GITHUB_CONNECTIONS_CLIENT_SECRET=<Client Secret from step 6>
```

> **Why two apps?** Auth.js manages the first app internally for sign-in. The second app is managed by the application directly for connecting GitHub accounts to fetch repos. They have different callback URLs and different scopes.

---

## Environment Variables

Create your `.env.local` by copying the example:

```bash
cp .env.example .env.local
```

Then fill in each variable:

| Variable                           | How to get it                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                     | Use `postgresql://postgres:postgres@localhost:5432/pomodoro` for local dev (matches docker-compose.yml). For production, use your VPS PostgreSQL connection string. |
| `AUTH_SECRET`                      | Run `npx auth secret` in the project root. It generates a random secret and writes it to `.env.local`. If it doesn't write automatically, copy the output value.    |
| `AUTH_GITHUB_ID`                   | Client ID from OAuth App 1 (User Authentication).                                                                                                                   |
| `AUTH_GITHUB_SECRET`               | Client Secret from OAuth App 1.                                                                                                                                     |
| `GITHUB_CONNECTIONS_CLIENT_ID`     | Client ID from OAuth App 2 (GitHub Connections).                                                                                                                    |
| `GITHUB_CONNECTIONS_CLIENT_SECRET` | Client Secret from OAuth App 2.                                                                                                                                     |

Your `.env.local` should look like:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pomodoro
AUTH_SECRET=your-generated-secret-here
AUTH_GITHUB_ID=Ov23li...
AUTH_GITHUB_SECRET=abc123...
GITHUB_CONNECTIONS_CLIENT_ID=Ov23li...
GITHUB_CONNECTIONS_CLIENT_SECRET=def456...
```

---

## Local Setup

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd pomodoro

# 2. Start PostgreSQL
docker compose up -d

# 3. Install dependencies
npm install

# 4. Set up environment variables
cp .env.example .env.local
# Fill in all values (see "Environment Variables" section above)
# Generate AUTH_SECRET:
npx auth secret

# 5. Run database migrations
npm run db:migrate

# 6. Start the dev server
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000). The landing page lets you continue in local guest mode or sign in with GitHub for synced sessions.

### Verifying the setup

- **Database:** Run `npm run db:studio` to open Drizzle Studio and inspect your tables
- **Auth:** Visit `http://localhost:3000/sign-in` and click "Sign in with GitHub"
- **Guest mode:** Visit `http://localhost:3000/guest/timer` or use the landing page CTA to start a local-only session
- **Timer:** Signed-in users can go to `/timer`, start against a task or without one, and see the active session from another signed-in browser

---

## Available Scripts

| Script                | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `npm run dev`         | Start dev server with Turbopack                      |
| `npm run build`       | Production build                                     |
| `npm start`           | Start production server (port 3000)                  |
| `npm test`            | Run unit tests in watch mode                         |
| `npm run test:run`    | Run unit tests once                                  |
| `npm run test:e2e`    | Run Playwright E2E tests                             |
| `npm run db:generate` | Generate Drizzle migration files from schema changes |
| `npm run db:migrate`  | Apply pending migrations to the database             |
| `npm run db:check-risk` | Scan migration SQL and emit warning-only risk hints |
| `npm run db:studio`   | Open Drizzle Studio (database browser)               |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                     # root layout, dark theme, auth provider
│   ├── page.tsx                       # public landing page with guest and sign-in entry points
│   ├── guest/timer/page.tsx           # local-only guest timer
│   ├── (auth)/
│   │   └── sign-in/page.tsx           # sign-in page (GitHub OAuth)
│   ├── (app)/                         # authenticated routes
│   │   ├── layout.tsx                 # sidebar + active session banner
│   │   ├── timer/page.tsx             # main timer view
│   │   ├── tasks/page.tsx             # task management
│   │   ├── log/page.tsx               # daily session log
│   │   ├── stats/page.tsx             # task-aware focus analytics
│   │   ├── projects/
│   │   │   ├── page.tsx               # project list
│   │   │   └── [id]/page.tsx          # project detail + session history
│   │   └── settings/page.tsx          # timer, goal, analytics, and connection settings
│   └── api/
│       ├── auth/[...nextauth]/        # Auth.js route handler
│       └── github/callback/           # GitHub connections OAuth callback
├── actions/                           # server actions
│   ├── active-session-actions.ts
│   ├── task-actions.ts
│   ├── project-actions.ts
│   ├── session-actions.ts
│   ├── settings-actions.ts
│   ├── stats-actions.ts
│   └── github-actions.ts
├── components/
│   ├── ui/                            # button, input, select, card, badge, dialog
│   ├── timer/                         # timer ring, display, controls, mode selector
│   ├── task/                          # task list, form, and quick actions
│   ├── session/                       # session card, list, daily summary
│   ├── project/                       # project card, form, list
│   ├── settings/                      # settings forms
│   ├── layout/                        # sidebar, user menu
│   └── providers/                     # auth session provider
├── hooks/
│   ├── use-active-session-sync.ts     # signed-in active session polling and actions
│   ├── use-timer.ts                   # timer state management
│   └── use-timer-persistence.ts       # localStorage persistence
├── lib/
│   ├── db/
│   │   ├── schema.ts                  # Drizzle schema (all tables)
│   │   └── index.ts                   # database connection
│   ├── auth.ts                        # Auth.js configuration
│   ├── auth-utils.ts                  # requireAuth() helper
│   ├── guest-import.ts                # guest-to-account import payload helpers
│   ├── guest-store.ts                 # guest workspace persistence
│   ├── github.ts                      # GitHub API client
│   ├── settings.ts                    # shared timer settings defaults and clamps
│   ├── validators.ts                  # input validation functions
│   └── utils.ts                       # cn() class merge utility
└── types/
    └── index.ts                       # shared TypeScript types
```

---

## VPS Deployment

### Prerequisites on VPS

- Node.js 20+
- PostgreSQL 17 (shared instance is fine, use a dedicated database)
- A reverse proxy (nginx or caddy)
- Docker with access to your app image

### CI Deployment Order

Main-branch deploys now run with explicit migration gating:

1. `validate` (lint + tests)
2. `build` (push image)
3. `migrate-on-vps` (SSH into VPS, run `npm run db:check-risk`, then run migrations inside VPS network)
4. `deploy` (only runs if migration step succeeded)

This fail-closed order means app rollout is blocked when migrations fail.
The app entrypoint no longer runs migrations on startup.

### Steps

```bash
# 1. Clone and install
git clone <repo-url>
cd pomodoro
npm ci

# 2. Set environment variables
# Create .env.local with production values:
# - DATABASE_URL pointing to your VPS PostgreSQL
# - AUTH_SECRET (generate a new one for production)
# - Update GitHub OAuth Apps with your production domain:
#   - Auth app callback: https://yourdomain.com/api/auth/callback/github
#   - Connections app callback: https://yourdomain.com/api/github/callback

# 3. Build
npm run build

# 4. Start
npm start
```

If you need a manual migration outside CI, run it from inside the VPS network (not from public internet):

```bash
docker run --rm --network vps-net \
  -e DATABASE_URL='postgresql://...' \
  ghcr.io/ny-randriantsarafara/pomodoro:latest \
  node scripts/migrate.mjs
```

The app listens on port 3000. Put it behind nginx or caddy:

```nginx
# /etc/nginx/sites-available/pomodoro
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Or with caddy (automatic HTTPS):

```
yourdomain.com {
    reverse_proxy localhost:3000
}
```

### Production checklist

- [ ] Generate a fresh `AUTH_SECRET` for production
- [ ] Update both GitHub OAuth Apps with production callback URLs
- [ ] Use a strong PostgreSQL password
- [ ] Set up SSL (caddy does this automatically, nginx needs certbot)
- [ ] Consider running with a process manager like pm2: `pm2 start npm -- start`
