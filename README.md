# Pomodoro

Focus. Build. Ship.

A multi-user Pomodoro timer with tiered focus modes, project-based session tracking, GitHub integration for project discovery, and a daily session log for standup reference.

## Features

- **Three focus modes** with proportional breaks:
  - Short Focus: 25 min work / 5 min break
  - Average Focus: 50 min work / 10 min break
  - Deep Focus: 90 min work / 20 min break
- **Project-based tracking** -- every session is tied to a project with a required task description
- **Daily Log** -- sessions grouped by date with summary stats, for standup reference
- **GitHub Integration** -- connect multiple GitHub accounts via OAuth, import repos as projects
- **Multi-user** -- proper authentication, each user's data fully isolated
- **Timer resilience** -- state persisted in localStorage, survives refreshes and tab closes
- **Dark minimal UI** -- near-black background, subtle noise texture, Instrument Serif headings, Geist Mono timer digits

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Database | PostgreSQL 17 + Drizzle ORM |
| Auth | Auth.js v5 (NextAuth) with GitHub OAuth |
| Styling | Tailwind CSS v4 |
| Testing | Vitest (unit) + Playwright (E2E) |

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

| Variable | How to get it |
|----------|--------------|
| `DATABASE_URL` | Use `postgresql://postgres:postgres@localhost:5432/pomodoro` for local dev (matches docker-compose.yml). For production, use your VPS PostgreSQL connection string. |
| `AUTH_SECRET` | Run `npx auth secret` in the project root. It generates a random secret and writes it to `.env.local`. If it doesn't write automatically, copy the output value. |
| `AUTH_GITHUB_ID` | Client ID from OAuth App 1 (User Authentication). |
| `AUTH_GITHUB_SECRET` | Client Secret from OAuth App 1. |
| `GITHUB_CONNECTIONS_CLIENT_ID` | Client ID from OAuth App 2 (GitHub Connections). |
| `GITHUB_CONNECTIONS_CLIENT_SECRET` | Client Secret from OAuth App 2. |

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

The app runs at [http://localhost:3000](http://localhost:3000). You'll be redirected to the sign-in page where you can authenticate with GitHub.

### Verifying the setup

- **Database:** Run `npm run db:studio` to open Drizzle Studio and inspect your tables
- **Auth:** Visit `http://localhost:3000/sign-in` and click "Sign in with GitHub"
- **Timer:** After signing in, you'll land on `/timer` -- create a project first, then start a session

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build |
| `npm start` | Start production server (port 3000) |
| `npm test` | Run unit tests in watch mode |
| `npm run test:run` | Run unit tests once |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run db:generate` | Generate Drizzle migration files from schema changes |
| `npm run db:migrate` | Apply pending migrations to the database |
| `npm run db:studio` | Open Drizzle Studio (database browser) |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                     # root layout, dark theme, auth provider
│   ├── page.tsx                       # redirects to /timer or /sign-in
│   ├── (auth)/
│   │   └── sign-in/page.tsx           # sign-in page (GitHub OAuth)
│   ├── (app)/                         # authenticated routes
│   │   ├── layout.tsx                 # sidebar + active session banner
│   │   ├── timer/page.tsx             # main timer view
│   │   ├── log/page.tsx               # daily session log
│   │   ├── projects/
│   │   │   ├── page.tsx               # project list
│   │   │   └── [id]/page.tsx          # project detail + session history
│   │   └── settings/page.tsx          # GitHub connections
│   └── api/
│       ├── auth/[...nextauth]/        # Auth.js route handler
│       └── github/callback/           # GitHub connections OAuth callback
├── actions/                           # server actions
│   ├── project-actions.ts
│   ├── session-actions.ts
│   └── github-actions.ts
├── components/
│   ├── ui/                            # button, input, select, card, badge, dialog
│   ├── timer/                         # timer ring, display, controls, mode selector
│   ├── session/                       # session card, list, daily summary
│   ├── project/                       # project card, form, list
│   ├── settings/                      # GitHub connections list
│   ├── layout/                        # sidebar, user menu
│   └── providers/                     # auth session provider
├── hooks/
│   ├── use-timer.ts                   # timer state management
│   └── use-timer-persistence.ts       # localStorage persistence
├── lib/
│   ├── db/
│   │   ├── schema.ts                  # Drizzle schema (all tables)
│   │   └── index.ts                   # database connection
│   ├── auth.ts                        # Auth.js configuration
│   ├── auth-utils.ts                  # requireAuth() helper
│   ├── github.ts                      # GitHub API client
│   ├── constants.ts                   # focus modes, validation limits
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

# 3. Run migrations
npm run db:migrate

# 4. Build
npm run build

# 5. Start
npm start
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
