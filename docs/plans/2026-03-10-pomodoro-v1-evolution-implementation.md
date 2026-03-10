# Pomodoro V1 Evolution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Evolve the existing Pomodoro app into a task-first, guest-capable, sync-first product with configurable timer behavior and shared active-session control across signed-in devices.

**Architecture:** Keep the existing Next.js app and Drizzle schema, add the missing product domains incrementally, and separate historical sessions from signed-in live session state. Guest mode remains fully local, while signed-in active sessions become server-owned records that clients poll and reconcile using timestamp-derived timer math and optimistic version checks.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM, PostgreSQL, Auth.js, Vitest, Playwright.

---

## Implementation Notes

- Execute this work in a dedicated git worktree even though this plan was authored in the main workspace.
- Keep migrations additive. Do not delete or repurpose existing production data until the replacement path is verified.
- Do not add any co-author trailer to commits.
- Prefer extracting pure timer and sync helpers into `src/lib` and testing them directly before wiring server actions or UI.

### Task 1: Add Schema Foundations For Tasks, Settings, And Active Sessions

**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/db/schema.test.ts`
- Create: `drizzle/0004_pomodoro_v1_evolution.sql`
- Modify: `drizzle/meta/_journal.json`
- Create: `drizzle/meta/0004_snapshot.json`

**Step 1: Write the failing schema tests**

```ts
import { describe, expect, it } from 'vitest';
import {
    activeSessions,
    tasks,
    userSettings,
} from './schema';

describe('pomodoro v1 schema', () => {
    it('defines tasks ownership and status fields', () => {
        expect(tasks.title.name).toBe('title');
        expect(tasks.status.name).toBe('status');
    });

    it('defines a unique active session per signed-in user', () => {
        expect(activeSessions.userId.name).toBe('user_id');
        expect(activeSessions.version.name).toBe('version');
    });

    it('defines persisted user timer settings', () => {
        expect(userSettings.workMinutes.name).toBe('work_minutes');
        expect(userSettings.longBreakFrequency.name).toBe('long_break_frequency');
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/db/schema.test.ts`

Expected: FAIL because `tasks`, `activeSessions`, and `userSettings` are not exported yet.

**Step 3: Write minimal implementation**

```ts
export const taskStatusEnum = pgEnum('task_status', [
    'active',
    'completed',
    'archived',
]);

export const tasks = pgTable('tasks', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    note: text('note'),
    status: taskStatusEnum('status').notNull().default('active'),
    dueAt: timestamp('due_at', { mode: 'date' }),
    estimatedPomodoros: integer('estimated_pomodoros'),
    completedPomodoros: integer('completed_pomodoros').notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const activeSessions = pgTable('active_sessions', {
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' })
        .unique(),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    currentPhase: varchar('current_phase', { length: 32 }).notNull(),
    phaseStartedAt: timestamp('phase_started_at', { mode: 'date' }).notNull(),
    phaseDurationSeconds: integer('phase_duration_seconds').notNull(),
    isPaused: integer('is_paused').notNull().default(0),
    pausedAt: timestamp('paused_at', { mode: 'date' }),
    totalPausedSeconds: integer('total_paused_seconds').notNull().default(0),
    completedFocusCount: integer('completed_focus_count').notNull().default(0),
    version: integer('version').notNull().default(1),
});

export const userSettings = pgTable('user_settings', {
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' })
        .primaryKey(),
    workMinutes: integer('work_minutes').notNull().default(25),
    shortBreakMinutes: integer('short_break_minutes').notNull().default(5),
    longBreakMinutes: integer('long_break_minutes').notNull().default(15),
    longBreakFrequency: integer('long_break_frequency').notNull().default(4),
    autoStartBreaks: integer('auto_start_breaks').notNull().default(0),
    autoStartFocus: integer('auto_start_focus').notNull().default(0),
});
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/db/schema.test.ts`

Expected: PASS with the new table exports available.

**Step 5: Commit**

```bash
git add src/lib/db/schema.ts src/lib/db/schema.test.ts drizzle/0004_pomodoro_v1_evolution.sql drizzle/meta/_journal.json drizzle/meta/0004_snapshot.json
git commit -m "feat: add pomodoro v1 schema foundations"
```

### Task 2: Add Shared Timer Settings Contracts And Defaults

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/constants.ts`
- Create: `src/lib/settings.ts`
- Create: `src/lib/settings.test.ts`
- Modify: `src/lib/validators.ts`
- Create: `src/lib/validators-settings.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
    DEFAULT_TIMER_SETTINGS,
    clampTimerSettings,
} from './settings';

describe('timer settings', () => {
    it('returns the approved pomodoro defaults', () => {
        expect(DEFAULT_TIMER_SETTINGS).toMatchObject({
            workMinutes: 25,
            shortBreakMinutes: 5,
            longBreakMinutes: 15,
            longBreakFrequency: 4,
        });
    });

    it('clamps invalid timer values into safe ranges', () => {
        expect(
            clampTimerSettings({
                workMinutes: 0,
                shortBreakMinutes: 500,
                longBreakMinutes: -1,
                longBreakFrequency: 99,
            })
        ).toMatchObject({
            workMinutes: 1,
            shortBreakMinutes: 60,
            longBreakMinutes: 1,
            longBreakFrequency: 12,
        });
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/settings.test.ts`

Expected: FAIL because `src/lib/settings.ts` does not exist yet.

**Step 3: Write minimal implementation**

```ts
export interface TimerSettings {
    readonly workMinutes: number;
    readonly shortBreakMinutes: number;
    readonly longBreakMinutes: number;
    readonly longBreakFrequency: number;
    readonly autoStartBreaks: boolean;
    readonly autoStartFocus: boolean;
}

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakFrequency: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
};

export function clampTimerSettings(input: Partial<TimerSettings>): TimerSettings {
    return {
        workMinutes: Math.min(180, Math.max(1, input.workMinutes ?? 25)),
        shortBreakMinutes: Math.min(60, Math.max(1, input.shortBreakMinutes ?? 5)),
        longBreakMinutes: Math.min(90, Math.max(1, input.longBreakMinutes ?? 15)),
        longBreakFrequency: Math.min(12, Math.max(1, input.longBreakFrequency ?? 4)),
        autoStartBreaks: input.autoStartBreaks ?? false,
        autoStartFocus: input.autoStartFocus ?? false,
    };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/settings.test.ts src/lib/validators-settings.test.ts`

Expected: PASS and the settings defaults become available for server and client code.

**Step 5: Commit**

```bash
git add src/types/index.ts src/lib/constants.ts src/lib/settings.ts src/lib/settings.test.ts src/lib/validators.ts src/lib/validators-settings.test.ts
git commit -m "feat: add timer settings contracts"
```

### Task 3: Build A Pure Active Session State Machine

**Files:**
- Create: `src/lib/active-session-machine.ts`
- Create: `src/lib/active-session-machine.test.ts`
- Modify: `src/types/index.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
    deriveRemainingSeconds,
    transitionToNextPhase,
} from './active-session-machine';

describe('active session machine', () => {
    it('derives remaining time from timestamps', () => {
        const remaining = deriveRemainingSeconds({
            nowMs: 60_000,
            phaseStartedAtMs: 0,
            phaseDurationSeconds: 120,
            isPaused: false,
            pausedAtMs: null,
            totalPausedSeconds: 0,
        });

        expect(remaining).toBe(60);
    });

    it('moves to long break after the configured number of completed focus sessions', () => {
        expect(
            transitionToNextPhase({
                currentPhase: 'focus',
                completedFocusCount: 3,
                longBreakFrequency: 4,
                shortBreakSeconds: 300,
                longBreakSeconds: 900,
            }).nextPhase
        ).toBe('long_break');
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/active-session-machine.test.ts`

Expected: FAIL because the state machine file does not exist yet.

**Step 3: Write minimal implementation**

```ts
export function deriveRemainingSeconds(input: {
    nowMs: number;
    phaseStartedAtMs: number;
    phaseDurationSeconds: number;
    isPaused: boolean;
    pausedAtMs: number | null;
    totalPausedSeconds: number;
}): number {
    const anchorMs =
        input.isPaused && input.pausedAtMs !== null ? input.pausedAtMs : input.nowMs;
    const elapsedSeconds =
        (anchorMs - input.phaseStartedAtMs) / 1000 - input.totalPausedSeconds;

    return Math.max(0, Math.ceil(input.phaseDurationSeconds - elapsedSeconds));
}

export function transitionToNextPhase(input: {
    currentPhase: 'focus' | 'short_break' | 'long_break';
    completedFocusCount: number;
    longBreakFrequency: number;
    shortBreakSeconds: number;
    longBreakSeconds: number;
}) {
    if (input.currentPhase !== 'focus') {
        return { nextPhase: 'focus', nextDurationSeconds: 0 };
    }

    const nextCompletedCount = input.completedFocusCount + 1;
    const isLongBreak = nextCompletedCount % input.longBreakFrequency === 0;

    return isLongBreak
        ? { nextPhase: 'long_break', nextDurationSeconds: input.longBreakSeconds }
        : { nextPhase: 'short_break', nextDurationSeconds: input.shortBreakSeconds };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/active-session-machine.test.ts`

Expected: PASS with deterministic timer math and phase transitions.

**Step 5: Commit**

```bash
git add src/lib/active-session-machine.ts src/lib/active-session-machine.test.ts src/types/index.ts
git commit -m "feat: add active session state machine"
```

### Task 4: Add Signed-In Active Session Server Actions With Version Checks

**Files:**
- Create: `src/actions/active-session-actions.ts`
- Create: `src/lib/active-session-actions.test.ts`
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/auth-utils.ts`
- Modify: `src/actions/session-actions.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
    buildVersionedUpdate,
    normalizePhaseAction,
} from './active-session-actions';

describe('active session action helpers', () => {
    it('bumps the version on every state mutation', () => {
        expect(buildVersionedUpdate({ version: 4 }).version).toBe(5);
    });

    it('maps skip from focus into a break phase action', () => {
        expect(
            normalizePhaseAction({
                currentPhase: 'focus',
                action: 'skip',
            }).nextPhase
        ).toBe('short_break');
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/active-session-actions.test.ts`

Expected: FAIL because the helper module does not exist yet.

**Step 3: Write minimal implementation**

```ts
export function buildVersionedUpdate(input: { version: number }) {
    return {
        version: input.version + 1,
        updatedAt: new Date(),
    };
}

export function normalizePhaseAction(input: {
    currentPhase: 'focus' | 'short_break' | 'long_break';
    action: 'pause' | 'resume' | 'skip' | 'stop';
}) {
    if (input.action === 'skip' && input.currentPhase === 'focus') {
        return { nextPhase: 'short_break' as const };
    }

    return { nextPhase: input.currentPhase };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/active-session-actions.test.ts`

Expected: PASS, after which wire the real server actions around these helpers and compare-and-swap updates against `active_sessions.version`.

**Step 5: Commit**

```bash
git add src/actions/active-session-actions.ts src/lib/active-session-actions.test.ts src/lib/db/schema.ts src/lib/auth-utils.ts src/actions/session-actions.ts
git commit -m "feat: add versioned active session actions"
```

### Task 5: Add Guest Storage And Guest Import Contracts

**Files:**
- Create: `src/lib/guest-store.ts`
- Create: `src/lib/guest-store.test.ts`
- Create: `src/lib/guest-import.ts`
- Create: `src/lib/guest-import.test.ts`
- Modify: `src/hooks/use-timer-persistence.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
    loadGuestWorkspace,
    saveGuestWorkspace,
} from './guest-store';

describe('guest workspace storage', () => {
    it('round-trips guest tasks and sessions', () => {
        saveGuestWorkspace({
            tasks: [{ id: 'task-1', title: 'Read chapter' }],
            sessions: [{ id: 'session-1', taskId: 'task-1' }],
        });

        expect(loadGuestWorkspace()?.tasks).toHaveLength(1);
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/guest-store.test.ts src/lib/guest-import.test.ts`

Expected: FAIL because guest storage helpers do not exist.

**Step 3: Write minimal implementation**

```ts
const GUEST_WORKSPACE_KEY = 'pomodoro-guest-workspace';

export function saveGuestWorkspace(workspace: unknown): void {
    localStorage.setItem(GUEST_WORKSPACE_KEY, JSON.stringify(workspace));
}

export function loadGuestWorkspace<T>(): T | null {
    const raw = localStorage.getItem(GUEST_WORKSPACE_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
}

export function clearGuestWorkspace(): void {
    localStorage.removeItem(GUEST_WORKSPACE_KEY);
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/guest-store.test.ts src/lib/guest-import.test.ts`

Expected: PASS, after which connect guest import to the first authenticated session entry point.

**Step 5: Commit**

```bash
git add src/lib/guest-store.ts src/lib/guest-store.test.ts src/lib/guest-import.ts src/lib/guest-import.test.ts src/hooks/use-timer-persistence.ts
git commit -m "feat: add guest storage and import contracts"
```

### Task 6: Introduce First-Class Tasks And Task Management UI

**Files:**
- Create: `src/actions/task-actions.ts`
- Create: `src/actions/task-actions.test.ts`
- Create: `src/app/(app)/tasks/page.tsx`
- Create: `src/components/task/task-list.tsx`
- Create: `src/components/task/task-card.tsx`
- Create: `src/components/task/task-form.tsx`
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/types/index.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { validateTaskTitle } from '@/lib/validators';

describe('task creation', () => {
    it('accepts a non-empty task title', () => {
        expect(validateTaskTitle('Write API tests')).toBeNull();
    });

    it('rejects an empty task title', () => {
        expect(validateTaskTitle('   ')).toBeTruthy();
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/actions/task-actions.test.ts`

Expected: FAIL because the task actions and task validators are not wired yet.

**Step 3: Write minimal implementation**

```ts
export async function createTask(input: {
    title: string;
    note?: string;
    projectIds?: ReadonlyArray<string>;
}) {
    const user = await requireAuth();
    const title = input.title.trim();

    if (title.length === 0) {
        return { success: false as const, error: 'Task title is required' };
    }

    const [task] = await db
        .insert(tasks)
        .values({
            userId: user.id,
            title,
            note: input.note?.trim() || null,
        })
        .returning();

    return { success: true as const, data: task };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/actions/task-actions.test.ts`

Expected: PASS, then build the `Tasks` route and add it to the sidebar.

**Step 5: Commit**

```bash
git add src/actions/task-actions.ts src/actions/task-actions.test.ts src/app/\(app\)/tasks/page.tsx src/components/task/task-list.tsx src/components/task/task-card.tsx src/components/task/task-form.tsx src/components/layout/sidebar.tsx src/types/index.ts
git commit -m "feat: add first-class tasks"
```

### Task 7: Refactor Timer UI To Be Task-First And Shared-State Aware

**Files:**
- Modify: `src/hooks/use-timer.ts`
- Modify: `src/app/(app)/timer/timer-view.tsx`
- Modify: `src/components/timer/session-setup.tsx`
- Modify: `src/components/timer/timer-controls.tsx`
- Modify: `src/components/timer/active-session-banner.tsx`
- Create: `src/components/timer/task-picker.tsx`
- Create: `src/hooks/use-active-session-sync.ts`
- Create: `src/hooks/use-active-session-sync.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { deriveBannerState } from './use-active-session-sync';

describe('active session sync hook helpers', () => {
    it('shows a remote-update message when the session version changes', () => {
        expect(
            deriveBannerState({
                previousVersion: 4,
                currentVersion: 5,
                lastModifiedByDeviceId: 'device-b',
                localDeviceId: 'device-a',
            }).showRemoteUpdate
        ).toBe(true);
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/hooks/use-active-session-sync.test.ts`

Expected: FAIL because the new sync hook does not exist yet.

**Step 3: Write minimal implementation**

```ts
export function deriveBannerState(input: {
    previousVersion: number;
    currentVersion: number;
    lastModifiedByDeviceId: string | null;
    localDeviceId: string;
}) {
    return {
        showRemoteUpdate:
            input.currentVersion > input.previousVersion &&
            input.lastModifiedByDeviceId !== null &&
            input.lastModifiedByDeviceId !== input.localDeviceId,
    };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/hooks/use-active-session-sync.test.ts`

Expected: PASS, then update the timer screen to read from signed-in server state or guest local state depending on session mode.

**Step 5: Commit**

```bash
git add src/hooks/use-timer.ts src/app/\(app\)/timer/timer-view.tsx src/components/timer/session-setup.tsx src/components/timer/timer-controls.tsx src/components/timer/active-session-banner.tsx src/components/timer/task-picker.tsx src/hooks/use-active-session-sync.ts src/hooks/use-active-session-sync.test.ts
git commit -m "feat: make timer task-first and sync-aware"
```

### Task 8: Expand Settings To Cover Timer Preferences And Daily Goals

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`
- Create: `src/actions/settings-actions.ts`
- Create: `src/actions/settings-actions.test.ts`
- Create: `src/components/settings/timer-settings-form.tsx`
- Create: `src/components/settings/daily-goal-form.tsx`
- Create: `src/components/settings/privacy-settings-form.tsx`
- Modify: `src/lib/constants.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { mergeSettingsPatch } from './settings-actions';

describe('settings patch merge', () => {
    it('preserves existing values when only one field changes', () => {
        expect(
            mergeSettingsPatch(
                { workMinutes: 25, shortBreakMinutes: 5 },
                { workMinutes: 50 }
            )
        ).toMatchObject({
            workMinutes: 50,
            shortBreakMinutes: 5,
        });
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/actions/settings-actions.test.ts`

Expected: FAIL because the settings actions module does not exist yet.

**Step 3: Write minimal implementation**

```ts
export function mergeSettingsPatch<T extends Record<string, unknown>>(
    current: T,
    patch: Partial<T>
): T {
    return {
        ...current,
        ...patch,
    };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/actions/settings-actions.test.ts`

Expected: PASS, then add forms for timer behavior, goals, and privacy preferences to the settings route.

**Step 5: Commit**

```bash
git add src/app/\(app\)/settings/page.tsx src/actions/settings-actions.ts src/actions/settings-actions.test.ts src/components/settings/timer-settings-form.tsx src/components/settings/daily-goal-form.tsx src/components/settings/privacy-settings-form.tsx src/lib/constants.ts
git commit -m "feat: expand timer and goal settings"
```

### Task 9: Update History And Stats To Be Task-Aware

**Files:**
- Modify: `src/actions/session-actions.ts`
- Modify: `src/actions/stats-actions.ts`
- Modify: `src/app/(app)/log/page.tsx`
- Modify: `src/app/(app)/stats/page.tsx`
- Modify: `src/components/session/session-list.tsx`
- Modify: `src/components/session/session-card.tsx`
- Modify: `src/components/stats/overview-cards.tsx`
- Modify: `src/components/stats/project-leaderboard.tsx`
- Create: `src/components/stats/task-leaderboard.tsx`
- Create: `src/actions/stats-actions.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { buildTaskLeaderboard } from './stats-actions';

describe('task leaderboard', () => {
    it('aggregates session time by task id', () => {
        expect(
            buildTaskLeaderboard([
                { taskId: 't1', durationSeconds: 1500 },
                { taskId: 't1', durationSeconds: 1500 },
            ])
        ).toEqual([
            { taskId: 't1', totalSeconds: 3000, sessionCount: 2 },
        ]);
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/actions/stats-actions.test.ts`

Expected: FAIL because task aggregation helpers are not defined yet.

**Step 3: Write minimal implementation**

```ts
export function buildTaskLeaderboard(
    sessions: ReadonlyArray<{ taskId: string | null; durationSeconds: number }>
) {
    const map = new Map<string, { taskId: string; totalSeconds: number; sessionCount: number }>();

    for (const session of sessions) {
        if (!session.taskId) continue;
        const existing = map.get(session.taskId) ?? {
            taskId: session.taskId,
            totalSeconds: 0,
            sessionCount: 0,
        };
        existing.totalSeconds += session.durationSeconds;
        existing.sessionCount += 1;
        map.set(session.taskId, existing);
    }

    return Array.from(map.values());
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/actions/stats-actions.test.ts`

Expected: PASS, then wire task filters and task analytics into log and stats screens.

**Step 5: Commit**

```bash
git add src/actions/session-actions.ts src/actions/stats-actions.ts src/app/\(app\)/log/page.tsx src/app/\(app\)/stats/page.tsx src/components/session/session-list.tsx src/components/session/session-card.tsx src/components/stats/overview-cards.tsx src/components/stats/project-leaderboard.tsx src/components/stats/task-leaderboard.tsx src/actions/stats-actions.test.ts
git commit -m "feat: make history and stats task-aware"
```

### Task 10: Add Guest Onboarding, Auth Upgrade, And Cross-Device E2E Coverage

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/(auth)/sign-in/page.tsx`
- Create: `src/components/auth/guest-upgrade-banner.tsx`
- Modify: `src/components/layout/user-menu.tsx`
- Create: `e2e/guest-mode.spec.ts`
- Create: `e2e/timer-sync.spec.ts`
- Modify: `e2e/timer.spec.ts`
- Modify: `README.md`

**Step 1: Write the failing end-to-end tests**

```ts
import { test, expect } from '@playwright/test';

test('signed-in session is visible from a second browser context', async ({
    browser,
}) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await pageA.goto('/timer');
    await pageB.goto('/timer');

    await expect(pageB.getByText('Focus in progress')).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/timer-sync.spec.ts`

Expected: FAIL because there is no signed-in shared active session behavior yet.

**Step 3: Write minimal implementation**

```tsx
export function GuestUpgradeBanner({ hasGuestData }: { hasGuestData: boolean }) {
    if (!hasGuestData) return null;

    return (
        <div role="status">
            <p>Your local sessions and tasks are ready to import.</p>
            <button type="button">Sign in to sync and import</button>
        </div>
    );
}
```

**Step 4: Run test to verify it passes**

Run: `npx playwright test e2e/guest-mode.spec.ts e2e/timer-sync.spec.ts`

Expected: PASS for guest local flow and signed-in cross-device visibility/control.

**Step 5: Commit**

```bash
git add src/app/page.tsx src/app/\(auth\)/sign-in/page.tsx src/components/auth/guest-upgrade-banner.tsx src/components/layout/user-menu.tsx e2e/guest-mode.spec.ts e2e/timer-sync.spec.ts e2e/timer.spec.ts README.md
git commit -m "feat: add guest onboarding and cross-device coverage"
```

### Task 11: Full Verification And Release Notes

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/2026-03-10-pomodoro-v1-evolution-design.md`
- Modify: `docs/plans/2026-03-10-pomodoro-v1-evolution-implementation.md`

**Step 1: Run unit tests**

Run: `npm run test:run`

Expected: PASS across the full Vitest suite.

**Step 2: Run end-to-end tests**

Run: `npm run test:e2e`

Expected: PASS across auth, projects, timer, guest mode, and timer sync flows.

**Step 3: Run static verification**

Run: `npm run lint && npm run build`

Expected: PASS with no blocking lint or build errors.

**Step 4: Update docs for shipped behavior**

```md
- Document guest mode and local-only limits.
- Document signed-in shared active sessions.
- Document the task-first workflow and optional project association.
```

**Step 5: Commit**

```bash
git add README.md docs/plans/2026-03-10-pomodoro-v1-evolution-design.md docs/plans/2026-03-10-pomodoro-v1-evolution-implementation.md
git commit -m "docs: finalize pomodoro v1 evolution docs"
```
