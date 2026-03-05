# Pomodoro — Focus. Build. Ship.

A multi-user Pomodoro timer app with tiered focus modes (Short 25m, Average 50m, Deep 90m), project-based session tracking, GitHub integration, and a daily log for standup reference.

## Features

- **Three focus modes:** Short Focus (25m), Average Focus (50m), Deep Focus (90m) with proportional breaks
- **Project-based session tracking** — every focus session tied to a project with a required task description
- **Daily Log** — view completed sessions grouped by date for standup reference
- **GitHub Integration** — connect multiple GitHub accounts (personal, work, etc.) via OAuth, import repos as projects
- **Multi-user auth** via GitHub OAuth
- **Dark minimal premium UI**

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- PostgreSQL + Drizzle ORM
- Auth.js v5 (GitHub OAuth)
- Tailwind CSS v4
- Vitest + Playwright

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)

## Getting Started

```bash
# Clone the repo
git clone <repo-url>
cd pomodoro

# Start PostgreSQL
docker compose up -d

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values:
# - Generate AUTH_SECRET: npx auth secret
# - Create a GitHub OAuth App for auth (callback: http://localhost:3000/api/auth/callback/github)
# - Create a separate GitHub OAuth App for connections (callback: http://localhost:3000/api/github/callback)

# Run database migrations
npm run db:migrate

# Start dev server
npm run dev
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run test` | Run unit tests (watch mode) |
| `npm run test:run` | Run unit tests once |
| `npm run test:e2e` | Run E2E tests |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:studio` | Open Drizzle Studio |

## VPS Deployment

- Build: `npm run build`
- Run: `npm start` (uses `next start` on port 3000)
- Put behind nginx or caddy as a reverse proxy
- Use a shared PostgreSQL instance with a dedicated `pomodoro` database
- Set all env vars in production
