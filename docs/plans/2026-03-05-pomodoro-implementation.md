# Pomodoro App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-user Pomodoro timer app with tiered focus modes, project-based session tracking, GitHub OAuth integration, and a daily session log.

**Architecture:** Next.js App Router with Server Components and Server Actions for the full stack. Auth.js handles multi-user authentication with GitHub OAuth. Drizzle ORM manages PostgreSQL schema and queries. Client components handle the timer, interactive UI, and localStorage persistence.

**Tech Stack:** Next.js 15, TypeScript, Auth.js v5, Drizzle ORM, PostgreSQL, Tailwind CSS v4, Vitest, React Testing Library, Playwright

**Design doc:** `docs/plans/2026-03-05-pomodoro-design.md`

**Naming conventions:**
- File names: dash-case (`focus-session.ts`)
- Variables & functions: camelCase (`focusMode`, `getProjects()`)
- Classes & interfaces: PascalCase (`FocusSession`, `ProjectService`)
- DB fields & tables: snake_case (`focus_sessions`, `created_at`)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `.env.local`, `.env.example`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`

**Step 1: Initialize Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
```

Expected: Project scaffolded with App Router, TypeScript, Tailwind, ESLint.

**Step 2: Install core dependencies**

Run:
```bash
npm install drizzle-orm postgres dotenv @auth/core @auth/drizzle-adapter next-auth@beta
npm install -D drizzle-kit @types/node vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Step 3: Create `.env.example`**

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pomodoro
AUTH_SECRET=generate-with-npx-auth-secret
AUTH_GITHUB_ID=your-github-oauth-app-id
AUTH_GITHUB_SECRET=your-github-oauth-app-secret
```

**Step 4: Create `.env.local`**

Copy `.env.example` and fill in local values. Generate AUTH_SECRET:

Run:
```bash
npx auth secret
```

**Step 5: Update `.gitignore`**

Ensure `.env.local` is listed (it should be by default from create-next-app). Add:
```
.env.local
.env*.local
```

**Step 6: Create Vitest config**

Create: `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Create: `src/test/setup.ts`

```typescript
import "@testing-library/jest-dom/vitest";
```

**Step 7: Add test script to `package.json`**

Add to `scripts`:
```json
"test": "vitest",
"test:run": "vitest run"
```

**Step 8: Verify setup**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with dependencies"
```

---

### Task 2: Database Schema & Connection

**Files:**
- Create: `src/lib/db/index.ts`, `src/lib/db/schema.ts`, `drizzle.config.ts`
- Test: `src/lib/db/schema.test.ts`

**Step 1: Create database connection**

Create: `src/lib/db/index.ts`

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

**Step 2: Create Drizzle schema**

Create: `src/lib/db/schema.ts`

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// Auth.js tables

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).$type<AdapterAccountType>().notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    {
      compositePk: primaryKey({
        columns: [account.provider, account.providerAccountId],
      }),
    },
  ]
);

export const authSessions = pgTable("auth_sessions", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [
    {
      compositePk: primaryKey({
        columns: [vt.identifier, vt.token],
      }),
    },
  ]
);

// Domain enums

export const focusModeEnum = pgEnum("focus_mode", ["short", "average", "deep"]);

export const sessionStatusEnum = pgEnum("session_status", [
  "completed",
  "interrupted",
  "abandoned",
]);

// Domain tables

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    githubRepoUrl: text("github_repo_url"),
    githubOwner: varchar("github_owner", { length: 255 }),
    githubRepoName: varchar("github_repo_name", { length: 255 }),
    color: varchar("color", { length: 7 }).notNull().default("#A0A0FF"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("projects_user_name_idx").on(table.userId, table.name),
  ]
);

export const focusSessions = pgTable("focus_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  focusMode: focusModeEnum("focus_mode").notNull(),
  task: text("task").notNull(),
  startedAt: timestamp("started_at", { mode: "date" }).notNull(),
  completedAt: timestamp("completed_at", { mode: "date" }),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  status: sessionStatusEnum("status").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const githubConnections = pgTable("github_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 50 }).notNull(),
  githubUsername: varchar("github_username", { length: 255 }).notNull(),
  accessToken: text("access_token").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// Type exports

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type FocusSession = typeof focusSessions.$inferSelect;
export type GithubConnection = typeof githubConnections.$inferSelect;
export type FocusMode = "short" | "average" | "deep";
export type SessionStatus = "completed" | "interrupted" | "abandoned";
```

**Step 3: Create Drizzle config**

Create: `drizzle.config.ts`

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Step 4: Write schema tests**

Create: `src/lib/db/schema.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import {
  users,
  projects,
  focusSessions,
  githubConnections,
  focusModeEnum,
  sessionStatusEnum,
} from "./schema";

describe("database schema", () => {
  it("defines focus mode enum with correct values", () => {
    expect(focusModeEnum.enumValues).toEqual(["short", "average", "deep"]);
  });

  it("defines session status enum with correct values", () => {
    expect(sessionStatusEnum.enumValues).toEqual([
      "completed",
      "interrupted",
      "abandoned",
    ]);
  });

  it("defines users table with expected columns", () => {
    const columns = Object.keys(users);
    expect(columns).toContain("id");
    expect(columns).toContain("name");
    expect(columns).toContain("email");
    expect(columns).toContain("createdAt");
  });

  it("defines projects table with expected columns", () => {
    const columns = Object.keys(projects);
    expect(columns).toContain("id");
    expect(columns).toContain("userId");
    expect(columns).toContain("name");
    expect(columns).toContain("color");
    expect(columns).toContain("githubRepoUrl");
  });

  it("defines focus_sessions table with expected columns", () => {
    const columns = Object.keys(focusSessions);
    expect(columns).toContain("id");
    expect(columns).toContain("userId");
    expect(columns).toContain("projectId");
    expect(columns).toContain("focusMode");
    expect(columns).toContain("task");
    expect(columns).toContain("startedAt");
    expect(columns).toContain("status");
  });

  it("defines github_connections table with expected columns", () => {
    const columns = Object.keys(githubConnections);
    expect(columns).toContain("id");
    expect(columns).toContain("userId");
    expect(columns).toContain("label");
    expect(columns).toContain("githubUsername");
    expect(columns).toContain("accessToken");
  });
});
```

**Step 5: Run tests**

Run:
```bash
npx vitest run src/lib/db/schema.test.ts
```

Expected: All tests pass.

**Step 6: Generate and run migrations**

First, ensure PostgreSQL is running locally with a `pomodoro` database:

Run:
```bash
createdb pomodoro 2>/dev/null || true
npx drizzle-kit generate
npx drizzle-kit migrate
```

Expected: Migration files generated in `drizzle/` folder. Tables created in database.

**Step 7: Add migration scripts to `package.json`**

Add to `scripts`:
```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio"
```

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add database schema and Drizzle ORM setup"
```

---

### Task 3: Auth.js Setup

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth-utils.ts`

**Step 1: Create Auth.js config**

Create: `src/lib/auth.ts`

```typescript
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import {
  users,
  accounts,
  authSessions,
  verificationTokens,
} from "@/lib/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: authSessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [GitHub],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
```

**Step 2: Create auth API route**

Create: `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

**Step 3: Create auth utility**

Create: `src/lib/auth-utils.ts`

```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  return session.user;
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Auth.js with GitHub OAuth and Drizzle adapter"
```

---

### Task 4: Shared Types & Constants

**Files:**
- Create: `src/types/index.ts`, `src/lib/constants.ts`
- Test: `src/lib/constants.test.ts`

**Step 1: Create shared types**

Create: `src/types/index.ts`

```typescript
import type { FocusMode, SessionStatus } from "@/lib/db/schema";

export interface TimerConfig {
  readonly workMinutes: number;
  readonly breakMinutes: number;
  readonly label: string;
}

export interface ActiveTimer {
  readonly sessionId: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly projectColor: string;
  readonly task: string;
  readonly focusMode: FocusMode;
  readonly startedAt: number;
  readonly durationSeconds: number;
  readonly isPaused: boolean;
  readonly pausedAt: number | null;
  readonly totalPausedSeconds: number;
}

export interface DailyLogSummary {
  readonly totalFocusSeconds: number;
  readonly sessionCount: number;
  readonly byMode: Record<FocusMode, number>;
}

export interface SessionWithProject {
  readonly id: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly projectColor: string;
  readonly focusMode: FocusMode;
  readonly task: string;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly durationSeconds: number;
  readonly status: SessionStatus;
}

export interface GitHubRepo {
  readonly id: number;
  readonly name: string;
  readonly fullName: string;
  readonly htmlUrl: string;
  readonly owner: string;
  readonly description: string | null;
}

export type ActionResult<T = void> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: string };
```

**Step 2: Create constants**

Create: `src/lib/constants.ts`

```typescript
import type { FocusMode } from "@/lib/db/schema";
import type { TimerConfig } from "@/types";

export const FOCUS_MODES: Record<FocusMode, TimerConfig> = {
  short: { workMinutes: 25, breakMinutes: 5, label: "Short Focus" },
  average: { workMinutes: 50, breakMinutes: 10, label: "Average Focus" },
  deep: { workMinutes: 90, breakMinutes: 20, label: "Deep Focus" },
} as const;

export const TASK_MAX_LENGTH = 500;
export const TASK_MIN_LENGTH = 1;
export const PROJECT_NAME_MAX_LENGTH = 100;
export const PROJECT_NAME_MIN_LENGTH = 1;
export const GITHUB_LABEL_MAX_LENGTH = 50;
export const GITHUB_LABEL_MIN_LENGTH = 1;

export const TIMER_STORAGE_KEY = "pomodoro-active-timer";
```

**Step 3: Write constants tests**

Create: `src/lib/constants.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { FOCUS_MODES } from "./constants";

describe("FOCUS_MODES", () => {
  it("defines short focus as 25 min work and 5 min break", () => {
    expect(FOCUS_MODES.short.workMinutes).toBe(25);
    expect(FOCUS_MODES.short.breakMinutes).toBe(5);
    expect(FOCUS_MODES.short.label).toBe("Short Focus");
  });

  it("defines average focus as 50 min work and 10 min break", () => {
    expect(FOCUS_MODES.average.workMinutes).toBe(50);
    expect(FOCUS_MODES.average.breakMinutes).toBe(10);
    expect(FOCUS_MODES.average.label).toBe("Average Focus");
  });

  it("defines deep focus as 90 min work and 20 min break", () => {
    expect(FOCUS_MODES.deep.workMinutes).toBe(90);
    expect(FOCUS_MODES.deep.breakMinutes).toBe(20);
    expect(FOCUS_MODES.deep.label).toBe("Deep Focus");
  });
});
```

**Step 4: Run tests**

Run:
```bash
npx vitest run src/lib/constants.test.ts
```

Expected: All tests pass.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add shared types and focus mode constants"
```

---

### Task 5: Base Layout, Theme & Fonts

**Files:**
- Create: `src/app/globals.css`, `src/app/layout.tsx` (modify), `src/components/layout/sidebar.tsx`, `src/components/layout/user-menu.tsx`, `src/app/(app)/layout.tsx`, `src/components/providers/session-provider.tsx`

**Step 1: Configure global styles and theme**

Modify: `src/app/globals.css`

Set up Tailwind v4 with CSS variables for the dark minimal theme:
- Background: `#0A0A0B`
- Surface: `#141416`
- Border: `#1F1F23`
- Text primary: `#EDEDEF`
- Text secondary: `#71717A`
- Accent: `#A0A0FF`

Import Google Fonts: Instrument Serif (display), Geist Sans (body), Geist Mono (monospace).

Add a subtle noise texture via CSS pseudo-element on body.

**Step 2: Create root layout**

Modify: `src/app/layout.tsx`

- Set `<html>` to `dark` class and `lang="en"`
- Apply Geist Sans as default, Instrument Serif and Geist Mono as CSS variables
- Wrap children in SessionProvider (Auth.js)
- Set metadata: title "Pomodoro", description

**Step 3: Create session provider wrapper**

Create: `src/components/providers/session-provider.tsx`

```typescript
"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
}

export function SessionProvider({ children }: Props) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
```

**Step 4: Create sidebar component**

Create: `src/components/layout/sidebar.tsx`

- `"use client"` component
- Narrow sidebar (64px collapsed, 200px expanded on hover)
- Icon-based nav: Timer (home), Log, Projects, Settings
- User avatar at bottom
- Uses `usePathname()` to highlight active route
- Smooth width transition on hover
- Icons: use Lucide React (`npm install lucide-react`)

**Step 5: Create user menu component**

Create: `src/components/layout/user-menu.tsx`

- Shows user avatar and name
- Sign out button
- Uses `useSession()` from next-auth/react

**Step 6: Create authenticated layout**

Create: `src/app/(app)/layout.tsx`

```typescript
import { requireAuth } from "@/lib/auth-utils";
import { Sidebar } from "@/components/layout/sidebar";
import type { ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
}

export default async function AppLayout({ children }: Props) {
  await requireAuth();

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
```

**Step 7: Install lucide-react**

Run:
```bash
npm install lucide-react
```

**Step 8: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds.

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: add base layout with dark theme, fonts, and sidebar"
```

---

### Task 6: UI Primitives

**Files:**
- Create: `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/select.tsx`, `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/dialog.tsx`

**Step 1: Create Button component**

Create: `src/components/ui/button.tsx`

- Variants: `primary` (accent bg), `secondary` (surface bg), `ghost` (transparent), `danger` (red)
- Sizes: `sm`, `md`, `lg`
- Proper `disabled` styling
- Uses `forwardRef`, accepts all button HTML attributes
- Subtle scale transform on hover, smooth transitions

**Step 2: Create Input component**

Create: `src/components/ui/input.tsx`

- Dark surface background with border
- Focus ring with accent color
- Label prop (optional)
- Error state with red border and message
- Uses `forwardRef`

**Step 3: Create Select component**

Create: `src/components/ui/select.tsx`

- Custom styled `<select>` matching the dark theme
- Same surface/border treatment as Input
- Chevron icon

**Step 4: Create Card component**

Create: `src/components/ui/card.tsx`

- Surface background (`#141416`) with 1px border (`#1F1F23`)
- Optional `header`, `footer` slots
- Padding variants

**Step 5: Create Badge component**

Create: `src/components/ui/badge.tsx`

- Pill-shaped
- Variants: `default`, `short`, `average`, `deep`, `completed`, `interrupted`, `abandoned`
- Each variant has a muted background with matching text color

**Step 6: Create Dialog component**

Create: `src/components/ui/dialog.tsx`

- Modal overlay with dark backdrop
- Centered card with title, content, and action buttons
- Close on backdrop click or Escape key
- Smooth fade-in animation

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add UI primitive components"
```

---

### Task 7: Auth Pages

**Files:**
- Create: `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/layout.tsx`

**Step 1: Create auth layout**

Create: `src/app/(auth)/layout.tsx`

- Centered layout, full viewport height
- Dark background with subtle noise texture
- No sidebar

**Step 2: Create sign-in page**

Create: `src/app/(auth)/sign-in/page.tsx`

- App name "Pomodoro" in Instrument Serif, large
- A tagline: "Focus. Build. Ship."
- "Sign in with GitHub" button using Auth.js `signIn("github")`
- GitHub icon on the button
- Minimal, centered, elegant

**Step 3: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add sign-in page with GitHub OAuth"
```

---

### Task 8: Project Server Actions & Data Access

**Files:**
- Create: `src/actions/project-actions.ts`, `src/lib/validators.ts`
- Test: `src/lib/validators.test.ts`

**Step 1: Create validators**

Create: `src/lib/validators.ts`

```typescript
import {
  TASK_MAX_LENGTH,
  TASK_MIN_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_NAME_MIN_LENGTH,
  GITHUB_LABEL_MAX_LENGTH,
  GITHUB_LABEL_MIN_LENGTH,
} from "./constants";

export function validateProjectName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < PROJECT_NAME_MIN_LENGTH) {
    return "Project name is required";
  }
  if (trimmed.length > PROJECT_NAME_MAX_LENGTH) {
    return `Project name must be at most ${PROJECT_NAME_MAX_LENGTH} characters`;
  }
  return null;
}

export function validateTask(task: string): string | null {
  const trimmed = task.trim();
  if (trimmed.length < TASK_MIN_LENGTH) {
    return "Task description is required";
  }
  if (trimmed.length > TASK_MAX_LENGTH) {
    return `Task must be at most ${TASK_MAX_LENGTH} characters`;
  }
  return null;
}

export function validateGithubLabel(label: string): string | null {
  const trimmed = label.trim();
  if (trimmed.length < GITHUB_LABEL_MIN_LENGTH) {
    return "Label is required";
  }
  if (trimmed.length > GITHUB_LABEL_MAX_LENGTH) {
    return `Label must be at most ${GITHUB_LABEL_MAX_LENGTH} characters`;
  }
  return null;
}

export function validateColor(color: string): string | null {
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return "Color must be a valid hex color (e.g. #A0A0FF)";
  }
  return null;
}
```

**Step 2: Write validator tests**

Create: `src/lib/validators.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import {
  validateProjectName,
  validateTask,
  validateGithubLabel,
  validateColor,
} from "./validators";

describe("validateProjectName", () => {
  it("returns null for valid name", () => {
    expect(validateProjectName("My Project")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(validateProjectName("")).toBe("Project name is required");
  });

  it("rejects whitespace-only string", () => {
    expect(validateProjectName("   ")).toBe("Project name is required");
  });

  it("rejects name over 100 characters", () => {
    const long = "a".repeat(101);
    expect(validateProjectName(long)).toContain("at most 100");
  });
});

describe("validateTask", () => {
  it("returns null for valid task", () => {
    expect(validateTask("Fix the auth bug")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(validateTask("")).toBe("Task description is required");
  });

  it("rejects task over 500 characters", () => {
    const long = "a".repeat(501);
    expect(validateTask(long)).toContain("at most 500");
  });
});

describe("validateGithubLabel", () => {
  it("returns null for valid label", () => {
    expect(validateGithubLabel("personal")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(validateGithubLabel("")).toBe("Label is required");
  });

  it("rejects label over 50 characters", () => {
    const long = "a".repeat(51);
    expect(validateGithubLabel(long)).toContain("at most 50");
  });
});

describe("validateColor", () => {
  it("returns null for valid hex color", () => {
    expect(validateColor("#A0A0FF")).toBeNull();
  });

  it("rejects invalid format", () => {
    expect(validateColor("red")).toContain("valid hex");
    expect(validateColor("#FFF")).toContain("valid hex");
    expect(validateColor("#GGGGGG")).toContain("valid hex");
  });
});
```

**Step 3: Run validator tests**

Run:
```bash
npx vitest run src/lib/validators.test.ts
```

Expected: All tests pass.

**Step 4: Create project server actions**

Create: `src/actions/project-actions.ts`

```typescript
"use server";

import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { validateProjectName, validateColor } from "@/lib/validators";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { Project } from "@/lib/db/schema";

export async function createProject(formData: FormData): Promise<ActionResult<Project>> {
  const user = await requireAuth();

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const color = (formData.get("color") as string) || "#A0A0FF";
  const githubRepoUrl = (formData.get("githubRepoUrl") as string) || null;
  const githubOwner = (formData.get("githubOwner") as string) || null;
  const githubRepoName = (formData.get("githubRepoName") as string) || null;

  const nameError = validateProjectName(name);
  if (nameError) {
    return { success: false, error: nameError };
  }

  const colorError = validateColor(color);
  if (colorError) {
    return { success: false, error: colorError };
  }

  try {
    const [project] = await db
      .insert(projects)
      .values({
        userId: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        color,
        githubRepoUrl,
        githubOwner,
        githubRepoName,
      })
      .returning();

    revalidatePath("/projects");
    revalidatePath("/timer");
    return { success: true, data: project };
  } catch (error) {
    if (String(error).includes("unique")) {
      return { success: false, error: "A project with this name already exists" };
    }
    return { success: false, error: "Failed to create project" };
  }
}

export async function getProjects(): Promise<ReadonlyArray<Project>> {
  const user = await requireAuth();

  return db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.updatedAt));
}

export async function getProjectById(projectId: string): Promise<Project | undefined> {
  const user = await requireAuth();

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));

  return project;
}

export async function updateProject(
  projectId: string,
  formData: FormData
): Promise<ActionResult<Project>> {
  const user = await requireAuth();

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const color = (formData.get("color") as string) || "#A0A0FF";

  const nameError = validateProjectName(name);
  if (nameError) {
    return { success: false, error: nameError };
  }

  const colorError = validateColor(color);
  if (colorError) {
    return { success: false, error: colorError };
  }

  try {
    const [project] = await db
      .update(projects)
      .set({
        name: name.trim(),
        description: description?.trim() || null,
        color,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
      .returning();

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    revalidatePath("/projects");
    revalidatePath("/timer");
    return { success: true, data: project };
  } catch (error) {
    if (String(error).includes("unique")) {
      return { success: false, error: "A project with this name already exists" };
    }
    return { success: false, error: "Failed to update project" };
  }
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  const user = await requireAuth();

  const [deleted] = await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .returning();

  if (!deleted) {
    return { success: false, error: "Project not found" };
  }

  revalidatePath("/projects");
  revalidatePath("/timer");
  return { success: true, data: undefined };
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add project server actions and validators"
```

---

### Task 9: Session Server Actions

**Files:**
- Create: `src/actions/session-actions.ts`

**Step 1: Create session server actions**

Create: `src/actions/session-actions.ts`

```typescript
"use server";

import { db } from "@/lib/db";
import { focusSessions, projects } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { validateTask } from "@/lib/validators";
import { FOCUS_MODES } from "@/lib/constants";
import { eq, and, desc, gte, lt, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult, SessionWithProject, DailyLogSummary } from "@/types";
import type { FocusSession, FocusMode } from "@/lib/db/schema";

export async function startSession(
  projectId: string,
  task: string,
  focusMode: FocusMode
): Promise<ActionResult<FocusSession>> {
  const user = await requireAuth();

  const taskError = validateTask(task);
  if (taskError) {
    return { success: false, error: taskError };
  }

  if (!FOCUS_MODES[focusMode]) {
    return { success: false, error: "Invalid focus mode" };
  }

  const [activeSession] = await db
    .select()
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, user.id),
        isNull(focusSessions.completedAt),
        eq(focusSessions.status, "completed")
      )
    );

  if (activeSession) {
    return { success: false, error: "You already have an active session. Complete or abandon it first." };
  }

  const durationSeconds = FOCUS_MODES[focusMode].workMinutes * 60;

  const [session] = await db
    .insert(focusSessions)
    .values({
      userId: user.id,
      projectId,
      focusMode,
      task: task.trim(),
      startedAt: new Date(),
      durationSeconds,
      status: "completed",
    })
    .returning();

  revalidatePath("/timer");
  revalidatePath("/log");
  return { success: true, data: session };
}

export async function completeSession(sessionId: string): Promise<ActionResult<FocusSession>> {
  const user = await requireAuth();

  const [session] = await db
    .update(focusSessions)
    .set({
      completedAt: new Date(),
      status: "completed",
    })
    .where(and(eq(focusSessions.id, sessionId), eq(focusSessions.userId, user.id)))
    .returning();

  if (!session) {
    return { success: false, error: "Session not found" };
  }

  revalidatePath("/timer");
  revalidatePath("/log");
  return { success: true, data: session };
}

export async function abandonSession(
  sessionId: string,
  elapsedSeconds: number
): Promise<ActionResult<FocusSession>> {
  const user = await requireAuth();

  const [session] = await db
    .update(focusSessions)
    .set({
      completedAt: new Date(),
      durationSeconds: Math.max(0, elapsedSeconds),
      status: "abandoned",
    })
    .where(and(eq(focusSessions.id, sessionId), eq(focusSessions.userId, user.id)))
    .returning();

  if (!session) {
    return { success: false, error: "Session not found" };
  }

  revalidatePath("/timer");
  revalidatePath("/log");
  return { success: true, data: session };
}

export async function getSessionsByDate(date: Date): Promise<ReadonlyArray<SessionWithProject>> {
  const user = await requireAuth();

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const rows = await db
    .select({
      id: focusSessions.id,
      projectId: focusSessions.projectId,
      projectName: projects.name,
      projectColor: projects.color,
      focusMode: focusSessions.focusMode,
      task: focusSessions.task,
      startedAt: focusSessions.startedAt,
      completedAt: focusSessions.completedAt,
      durationSeconds: focusSessions.durationSeconds,
      status: focusSessions.status,
    })
    .from(focusSessions)
    .innerJoin(projects, eq(focusSessions.projectId, projects.id))
    .where(
      and(
        eq(focusSessions.userId, user.id),
        gte(focusSessions.startedAt, startOfDay),
        lt(focusSessions.startedAt, endOfDay)
      )
    )
    .orderBy(desc(focusSessions.startedAt));

  return rows;
}

export async function getDailyLogSummary(date: Date): Promise<DailyLogSummary> {
  const sessions = await getSessionsByDate(date);

  const completedSessions = sessions.filter((s) => s.status === "completed");

  const totalFocusSeconds = completedSessions.reduce(
    (sum, s) => sum + s.durationSeconds,
    0
  );

  const byMode: Record<FocusMode, number> = { short: 0, average: 0, deep: 0 };
  for (const session of completedSessions) {
    byMode[session.focusMode] += 1;
  }

  return {
    totalFocusSeconds,
    sessionCount: completedSessions.length,
    byMode,
  };
}

export async function getSessionsByProject(
  projectId: string
): Promise<ReadonlyArray<SessionWithProject>> {
  const user = await requireAuth();

  const rows = await db
    .select({
      id: focusSessions.id,
      projectId: focusSessions.projectId,
      projectName: projects.name,
      projectColor: projects.color,
      focusMode: focusSessions.focusMode,
      task: focusSessions.task,
      startedAt: focusSessions.startedAt,
      completedAt: focusSessions.completedAt,
      durationSeconds: focusSessions.durationSeconds,
      status: focusSessions.status,
    })
    .from(focusSessions)
    .innerJoin(projects, eq(focusSessions.projectId, projects.id))
    .where(
      and(
        eq(focusSessions.userId, user.id),
        eq(focusSessions.projectId, projectId)
      )
    )
    .orderBy(desc(focusSessions.startedAt));

  return rows;
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add focus session server actions"
```

---

### Task 10: Timer Component

**Files:**
- Create: `src/components/timer/timer-ring.tsx`, `src/components/timer/timer-controls.tsx`, `src/components/timer/mode-selector.tsx`, `src/components/timer/timer-display.tsx`, `src/components/timer/session-setup.tsx`, `src/hooks/use-timer.ts`, `src/hooks/use-timer-persistence.ts`
- Test: `src/hooks/use-timer.test.ts`

**Step 1: Create timer persistence hook**

Create: `src/hooks/use-timer-persistence.ts`

- Reads/writes `ActiveTimer` to `localStorage` under key `TIMER_STORAGE_KEY`
- `saveTimer(timer: ActiveTimer): void`
- `loadTimer(): ActiveTimer | null`
- `clearTimer(): void`
- Handles JSON parse errors gracefully (returns null)

**Step 2: Create timer hook**

Create: `src/hooks/use-timer.ts`

- `useTimer()` hook managing the full timer lifecycle
- State: `activeTimer: ActiveTimer | null`, `remainingSeconds: number`, `phase: "idle" | "focus" | "break"`
- Uses `setInterval` (1 second tick) to decrement remaining time
- On mount, checks localStorage for an active timer and resumes if within duration
- `startTimer(config)` — sets up ActiveTimer, saves to localStorage
- `pauseTimer()` — records pausedAt timestamp, stops interval
- `resumeTimer()` — calculates paused duration, resumes interval
- `abandonTimer()` — calls abandonSession server action, clears localStorage
- `completeTimer()` — calls completeSession server action, transitions to break phase
- Auto-completes when remainingSeconds hits 0
- Tracks `totalPausedSeconds` accurately across multiple pause/resume cycles

**Step 3: Write timer hook tests**

Create: `src/hooks/use-timer.test.ts`

Test cases:
- Initial state is idle with no active timer
- Starting a timer sets phase to "focus" and calculates remaining seconds
- Pausing records pausedAt and stops countdown
- Resuming after pause accounts for paused duration
- Timer auto-completes when remaining reaches 0
- Loading from localStorage resumes with corrected elapsed time

**Step 4: Run timer hook tests**

Run:
```bash
npx vitest run src/hooks/use-timer.test.ts
```

Expected: All tests pass.

**Step 5: Create TimerRing component**

Create: `src/components/timer/timer-ring.tsx`

- `"use client"` component
- SVG circle with `stroke-dasharray` and `stroke-dashoffset` for progress
- Props: `progress` (0-1), `size` (px), `strokeWidth` (px)
- Accent color (`#A0A0FF`) for the progress stroke, dim gray for track
- Smooth CSS transition on stroke-dashoffset
- Subtle glow effect on the progress end

**Step 6: Create TimerDisplay component**

Create: `src/components/timer/timer-display.tsx`

- Renders minutes:seconds in Geist Mono, large (text-5xl to text-7xl)
- Centered inside the timer ring
- Shows focus mode label below the digits
- Shows task and project name beneath

**Step 7: Create ModeSelector component**

Create: `src/components/timer/mode-selector.tsx`

- Three buttons: Short Focus, Average Focus, Deep Focus
- Shows duration beneath each label (25m, 50m, 90m)
- Selected mode gets accent border and subtle background
- Disabled when timer is active

**Step 8: Create SessionSetup component**

Create: `src/components/timer/session-setup.tsx`

- Project selector dropdown (fetches from `getProjects`)
- Task input field (required)
- ModeSelector embedded
- Start button (disabled until project + task filled)
- This is the "pre-timer" state of the timer page

**Step 9: Create TimerControls component**

Create: `src/components/timer/timer-controls.tsx`

- Shown during active focus session
- Pause/Resume button (toggles)
- Abandon button (opens confirmation dialog)
- Minimal, centered beneath the timer ring

**Step 10: Commit**

```bash
git add -A
git commit -m "feat: add timer components and useTimer hook"
```

---

### Task 11: Timer Page

**Files:**
- Create: `src/app/(app)/timer/page.tsx`

**Step 1: Build the timer page**

Create: `src/app/(app)/timer/page.tsx`

- Server component that fetches projects via `getProjects()`
- Passes projects to a client component `TimerView`
- `TimerView` orchestrates SessionSetup (idle state) and the active timer view
- When idle: show SessionSetup centered with the timer ring in "empty" state
- When active: show TimerRing + TimerDisplay + TimerControls, sidebar dims
- When on break: show break timer with remaining break time, auto-return to idle after
- Full-viewport centered layout with generous whitespace

**Step 2: Create the redirect from root**

Modify: `src/app/page.tsx`

```typescript
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  if (session) {
    redirect("/timer");
  }

  redirect("/sign-in");
}
```

**Step 3: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add timer page with full session flow"
```

---

### Task 12: Project Pages

**Files:**
- Create: `src/app/(app)/projects/page.tsx`, `src/app/(app)/projects/[id]/page.tsx`, `src/components/project/project-card.tsx`, `src/components/project/project-form.tsx`, `src/components/project/project-list.tsx`

**Step 1: Create ProjectCard component**

Create: `src/components/project/project-card.tsx`

- Shows project name with color dot
- Description (truncated)
- GitHub repo link if connected
- Session count for the project
- Click navigates to project detail

**Step 2: Create ProjectForm component**

Create: `src/components/project/project-form.tsx`

- `"use client"` component
- Fields: name, description, color picker (preset colors + hex input)
- Optional GitHub repo linking (shown if GitHub connections exist)
- Calls `createProject` or `updateProject` server action
- Shows validation errors inline
- Used in both create and edit contexts

**Step 3: Create ProjectList component**

Create: `src/components/project/project-list.tsx`

- Grid of ProjectCards
- "New Project" card with plus icon
- Opens ProjectForm in a dialog when clicking "New Project"

**Step 4: Build projects list page**

Create: `src/app/(app)/projects/page.tsx`

- Server component
- Fetches projects via `getProjects()`
- Renders ProjectList
- Page title "Projects" in Instrument Serif

**Step 5: Build project detail page**

Create: `src/app/(app)/projects/[id]/page.tsx`

- Server component
- Fetches project by ID and its session history
- Shows project info, edit button, delete button
- Session history list (reuses session card components from Task 13)
- 404 if project not found

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add project list and detail pages"
```

---

### Task 13: Daily Log Page

**Files:**
- Create: `src/app/(app)/log/page.tsx`, `src/components/session/session-card.tsx`, `src/components/session/session-list.tsx`, `src/components/session/daily-summary.tsx`, `src/components/session/date-picker.tsx`

**Step 1: Create SessionCard component**

Create: `src/components/session/session-card.tsx`

- Project color dot + project name
- Task description
- Focus mode badge (Short/Average/Deep)
- Duration formatted (e.g. "25m", "1h 30m")
- Status badge (completed/interrupted/abandoned)
- Time started (e.g. "2:30 PM")
- Soft fade-in animation

**Step 2: Create DailySummary component**

Create: `src/components/session/daily-summary.tsx`

- Total focus time (formatted hours + minutes)
- Session count
- Breakdown by mode (3 small counts)
- Displayed as a compact summary bar at the top of the log

**Step 3: Create DatePicker component**

Create: `src/components/session/date-picker.tsx`

- `"use client"` component
- Previous/Next day buttons with date display
- Today button for quick return
- Updates URL search params to control which date is shown

**Step 4: Create SessionList component**

Create: `src/components/session/session-list.tsx`

- Renders a list of SessionCards
- Empty state: "No sessions yet today. Start focusing!"
- Staggered fade-in animation for list items

**Step 5: Build daily log page**

Create: `src/app/(app)/log/page.tsx`

- Server component
- Reads `date` from search params (defaults to today)
- Fetches sessions and summary for that date
- Optional project filter via search param
- Renders DatePicker, DailySummary, SessionList
- Page title "Daily Log" in Instrument Serif

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add daily log page with session history"
```

---

### Task 14: GitHub Integration

**Files:**
- Create: `src/lib/github.ts`, `src/actions/github-actions.ts`, `src/app/api/github/callback/route.ts`

**Step 1: Create GitHub API client**

Create: `src/lib/github.ts`

```typescript
import type { GitHubRepo } from "@/types";

const GITHUB_API_BASE = "https://api.github.com";

export async function fetchUserRepos(
  accessToken: string
): Promise<ReadonlyArray<GitHubRepo>> {
  const response = await fetch(`${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const repos = await response.json();

  return repos.map((repo: Record<string, unknown>) => ({
    id: repo.id as number,
    name: repo.name as string,
    fullName: repo.full_name as string,
    htmlUrl: repo.html_url as string,
    owner: (repo.owner as Record<string, unknown>).login as string,
    description: (repo.description as string) || null,
  }));
}

export async function fetchGitHubUsername(accessToken: string): Promise<string> {
  const response = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const user = await response.json();
  return user.login as string;
}
```

**Step 2: Create GitHub server actions**

Create: `src/actions/github-actions.ts`

```typescript
"use server";

import { db } from "@/lib/db";
import { githubConnections } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { validateGithubLabel } from "@/lib/validators";
import { fetchUserRepos, fetchGitHubUsername } from "@/lib/github";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult, GitHubRepo } from "@/types";
import type { GithubConnection } from "@/lib/db/schema";

export async function getGithubConnections(): Promise<ReadonlyArray<GithubConnection>> {
  const user = await requireAuth();

  return db
    .select()
    .from(githubConnections)
    .where(eq(githubConnections.userId, user.id));
}

export async function addGithubConnection(
  label: string,
  accessToken: string,
  githubUsername: string
): Promise<ActionResult<GithubConnection>> {
  const user = await requireAuth();

  const labelError = validateGithubLabel(label);
  if (labelError) {
    return { success: false, error: labelError };
  }

  const [connection] = await db
    .insert(githubConnections)
    .values({
      userId: user.id,
      label: label.trim(),
      githubUsername,
      accessToken,
    })
    .returning();

  revalidatePath("/settings");
  return { success: true, data: connection };
}

export async function removeGithubConnection(
  connectionId: string
): Promise<ActionResult> {
  const user = await requireAuth();

  const [deleted] = await db
    .delete(githubConnections)
    .where(
      and(
        eq(githubConnections.id, connectionId),
        eq(githubConnections.userId, user.id)
      )
    )
    .returning();

  if (!deleted) {
    return { success: false, error: "Connection not found" };
  }

  revalidatePath("/settings");
  return { success: true, data: undefined };
}

export async function fetchReposForConnection(
  connectionId: string
): Promise<ActionResult<ReadonlyArray<GitHubRepo>>> {
  const user = await requireAuth();

  const [connection] = await db
    .select()
    .from(githubConnections)
    .where(
      and(
        eq(githubConnections.id, connectionId),
        eq(githubConnections.userId, user.id)
      )
    );

  if (!connection) {
    return { success: false, error: "Connection not found" };
  }

  try {
    const repos = await fetchUserRepos(connection.accessToken);
    return { success: true, data: repos };
  } catch {
    return { success: false, error: "Failed to fetch repos. Token may be expired." };
  }
}
```

**Step 3: Create GitHub OAuth callback route**

Create: `src/app/api/github/callback/route.ts`

This handles the OAuth flow specifically for GitHub connections (separate from Auth.js sign-in):

- Receives authorization code from GitHub
- Exchanges code for access token
- Fetches GitHub username
- Saves connection via `addGithubConnection`
- Redirects back to settings page

Docs needed: Register a separate GitHub OAuth App for connections (distinct from the Auth.js one) with callback URL pointing to `/api/github/callback`.

Add to `.env.example`:
```env
GITHUB_CONNECTIONS_CLIENT_ID=your-github-connections-app-id
GITHUB_CONNECTIONS_CLIENT_SECRET=your-github-connections-app-secret
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add GitHub integration with OAuth and repo fetching"
```

---

### Task 15: Settings Page

**Files:**
- Create: `src/app/(app)/settings/page.tsx`, `src/components/settings/github-connections-list.tsx`, `src/components/settings/add-connection-button.tsx`

**Step 1: Create GitHubConnectionsList component**

Create: `src/components/settings/github-connections-list.tsx`

- `"use client"` component
- Lists all GitHub connections with: label, GitHub username, connected date
- "Disconnect" button on each (calls `removeGithubConnection`, with confirmation dialog)
- "Connect GitHub Account" button at the bottom

**Step 2: Create AddConnectionButton component**

Create: `src/components/settings/add-connection-button.tsx`

- `"use client"` component
- Prompts for a label via a small inline form
- Then redirects to GitHub OAuth URL with the label stored in state/URL params
- After OAuth callback, connection appears in the list

**Step 3: Build settings page**

Create: `src/app/(app)/settings/page.tsx`

- Server component
- Fetches GitHub connections
- Section: "GitHub Connections" with the connections list
- Page title "Settings" in Instrument Serif

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add settings page with GitHub connection management"
```

---

### Task 16: Active Session Banner

**Files:**
- Create: `src/components/timer/active-session-banner.tsx`
- Modify: `src/app/(app)/layout.tsx`

**Step 1: Create ActiveSessionBanner component**

Create: `src/components/timer/active-session-banner.tsx`

- `"use client"` component
- Reads active timer from localStorage
- If a timer is active and user is NOT on `/timer` page, shows a sticky banner at top:
  - "Focus session in progress: [task] — [remaining time]"
  - Click navigates back to `/timer`
- Subtle accent border-bottom, dark background

**Step 2: Add banner to app layout**

Modify: `src/app/(app)/layout.tsx`

- Add `<ActiveSessionBanner />` above the main content area

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add active session banner for navigation awareness"
```

---

### Task 17: Polish & Animations

**Files:**
- Modify: various component files

**Step 1: Add page transition animations**

- Gentle crossfade on route changes using CSS transitions on the main content area
- Staggered fade-in for list items (session cards, project cards)

**Step 2: Timer completion animation**

- On timer completion: radial pulse from the timer ring center
- Ring fills with accent color briefly, then resets
- Subtle screen flash effect

**Step 3: Add `beforeunload` handler**

Modify: `src/hooks/use-timer.ts`

- Register `beforeunload` event when timer is active
- Show browser confirmation dialog

**Step 4: Verify build and tests**

Run:
```bash
npm run test:run
npm run build
```

Expected: All tests pass, build succeeds.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add animations and polish"
```

---

### Task 18: E2E Setup (Playwright)

**Files:**
- Create: `playwright.config.ts`, `e2e/auth.setup.ts`, `e2e/timer.spec.ts`, `e2e/projects.spec.ts`

**Step 1: Install Playwright**

Run:
```bash
npm install -D @playwright/test
npx playwright install
```

**Step 2: Create Playwright config**

Create: `playwright.config.ts`

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

**Step 3: Write E2E tests**

Create basic E2E tests for:
- Sign-in page renders
- Timer page loads after auth
- Creating a project
- Starting and completing a focus session
- Daily log shows completed sessions

**Step 4: Add E2E script to `package.json`**

```json
"test:e2e": "playwright test"
```

**Step 5: Commit**

```bash
git add -A
git commit -m "test: add Playwright E2E test setup"
```

---

### Task 19: Docker Compose for Local Dev

**Files:**
- Create: `docker-compose.yml`

**Step 1: Create Docker Compose file**

Create: `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:17-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: pomodoro
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Step 2: Update README with setup instructions**

Create: `README.md`

- Project overview
- Prerequisites: Node.js 20+, Docker
- Setup steps: clone, `docker compose up -d`, copy `.env.example`, `npm install`, `npm run db:migrate`, `npm run dev`
- Available scripts
- Tech stack summary

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: add Docker Compose for local PostgreSQL and README"
```
