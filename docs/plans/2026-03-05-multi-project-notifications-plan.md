# Multi-Project Sessions + Timer Notifications Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow tagging focus sessions with multiple projects, play an alarm sound, and send a native OS notification when the timer completes.

**Architecture:** Junction table `session_projects` replaces the single `project_id` FK on `focus_sessions`. Web Audio API generates alarm tones client-side. Browser Notification API sends native OS notifications. All queries and types updated to work with arrays of projects instead of a single project.

**Tech Stack:** Drizzle ORM (PostgreSQL), Next.js Server Actions, Web Audio API, Browser Notification API, TypeScript

---

### Task 1: Add `session_projects` junction table to schema

**Files:**
- Modify: `src/lib/db/schema.ts`

**Step 1: Add the junction table**

Add after the `focusSessions` table definition in `src/lib/db/schema.ts`:

```typescript
export const sessionProjects = pgTable(
    'session_projects',
    {
        sessionId: uuid('session_id')
            .notNull()
            .references(() => focusSessions.id, { onDelete: 'cascade' }),
        projectId: uuid('project_id')
            .notNull()
            .references(() => projects.id, { onDelete: 'cascade' }),
    },
    (table) => [
        {
            compositePk: primaryKey({
                columns: [table.sessionId, table.projectId],
            }),
        },
    ]
);
```

Add `SessionProject` type export:

```typescript
export type SessionProject = typeof sessionProjects.$inferSelect;
```

**Step 2: Remove `projectId` from `focusSessions`**

Delete the `projectId` field from the `focusSessions` table:

```typescript
projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
```

**Step 3: Generate and run migration**

Run: `npm run db:generate`
Then run: `npm run db:migrate`

The migration SQL needs manual editing to:
1. Create `session_projects` table FIRST
2. Copy existing data: `INSERT INTO session_projects (session_id, project_id) SELECT id, project_id FROM focus_sessions`
3. Then drop the `project_id` column

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add session_projects junction table, remove single projectId FK"
```

---

### Task 2: Update TypeScript types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add `SessionProjectRef` interface**

```typescript
export interface SessionProjectRef {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}
```

**Step 2: Update `StartTimerParams`**

Replace `projectId`, `projectName`, `projectColor` with:

```typescript
export interface StartTimerParams {
  readonly sessionId: string;
  readonly projects: ReadonlyArray<SessionProjectRef>;
  readonly task: string;
  readonly focusMode: FocusMode;
  readonly durationSeconds: number;
}
```

**Step 3: Update `ActiveTimer`**

Replace `projectId`, `projectName`, `projectColor` with:

```typescript
export interface ActiveTimer {
  readonly sessionId: string;
  readonly projects: ReadonlyArray<SessionProjectRef>;
  readonly task: string;
  readonly focusMode: FocusMode;
  readonly startedAt: number;
  readonly durationSeconds: number;
  readonly isPaused: boolean;
  readonly pausedAt: number | null;
  readonly totalPausedSeconds: number;
}
```

**Step 4: Update `SessionWithProject` → `SessionWithProjects`**

```typescript
export interface SessionWithProjects {
  readonly id: string;
  readonly projects: ReadonlyArray<SessionProjectRef>;
  readonly focusMode: FocusMode;
  readonly task: string;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly durationSeconds: number;
  readonly status: SessionStatus;
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: update types for multi-project sessions"
```

---

### Task 3: Update server actions for multi-project

**Files:**
- Modify: `src/actions/session-actions.ts`

**Step 1: Update `startSession`**

Change signature to accept `projectIds: ReadonlyArray<string>` instead of a single `projectId`.

After inserting the `focusSessions` row (without `projectId` now), insert rows into `session_projects`:

```typescript
export async function startSession(
    projectIds: ReadonlyArray<string>,
    task: string,
    focusMode: FocusMode
): Promise<ActionResult<FocusSession>> {
```

After creating the session:

```typescript
await db.insert(sessionProjects).values(
    projectIds.map((pid) => ({
        sessionId: session.id,
        projectId: pid,
    }))
);
```

**Step 2: Update `getSessionsByDate`**

Replace the `innerJoin` with `focusSessions.projectId` with a subquery or secondary query to get projects from `session_projects`:

1. First query: get all sessions for the date
2. Second query: get all `session_projects` rows for those session IDs, joined with `projects`
3. Group projects by session ID and build `SessionWithProjects` objects

**Step 3: Update `getSessionsByProject`**

Join through `session_projects` instead of `focusSessions.projectId`:

```typescript
.from(focusSessions)
.innerJoin(sessionProjects, eq(focusSessions.id, sessionProjects.sessionId))
.where(
    and(
        eq(focusSessions.userId, user.id),
        eq(sessionProjects.projectId, projectId)
    )
)
```

Then load all projects for each session via a second query.

**Step 4: Update `getDailyLogSummary`**

Should still work since it calls `getSessionsByDate`. No changes needed beyond the type update.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: update session actions for multi-project support"
```

---

### Task 4: Update stats actions for multi-project

**Files:**
- Modify: `src/actions/stats-actions.ts`

**Step 1: Update `getStats`**

Replace the `innerJoin` on `focusSessions.projectId` with joining through `session_projects`:

1. Query sessions without project join first
2. Query `session_projects` joined with `projects` for all session IDs
3. Build the project stats map by iterating through session-project pairs

Each project tagged on a session gets 100% credit for that session's duration.

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: update stats actions for multi-project support"
```

---

### Task 5: Create alarm module

**Files:**
- Create: `src/lib/alarm.ts`

**Step 1: Implement Web Audio API alarm**

```typescript
let audioContext: AudioContext | null = null;
let alarmTimeoutId: ReturnType<typeof setTimeout> | null = null;

function getAudioContext(): AudioContext {
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    return audioContext;
}

function playBeep(ctx: AudioContext, startTime: number): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 440;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.2);
}

export function playAlarm(): void {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    // 3 beeps, 350ms apart, repeated twice (6 beeps total over ~2s)
    for (let round = 0; round < 2; round++) {
        for (let i = 0; i < 3; i++) {
            playBeep(ctx, now + round * 1.2 + i * 0.35);
        }
    }
    // Auto-stop context after 5 seconds
    alarmTimeoutId = setTimeout(() => {
        stopAlarm();
    }, 5000);
}

export function stopAlarm(): void {
    if (alarmTimeoutId) {
        clearTimeout(alarmTimeoutId);
        alarmTimeoutId = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
}
```

**Step 2: Commit**

```bash
git add src/lib/alarm.ts
git commit -m "feat: add Web Audio API alarm module"
```

---

### Task 6: Create notification module

**Files:**
- Create: `src/lib/notifications.ts`

**Step 1: Implement Notification API wrapper**

```typescript
export function isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | null {
    if (!isNotificationSupported()) return null;
    return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | null> {
    if (!isNotificationSupported()) return null;
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return Notification.requestPermission();
}

export function sendTimerCompleteNotification(task: string): void {
    if (!isNotificationSupported()) return;
    if (Notification.permission !== 'granted') return;
    new Notification('Focus Complete', {
        body: `"${task}" — time for a break!`,
        icon: '/icon.png',
    });
}
```

**Step 2: Commit**

```bash
git add src/lib/notifications.ts
git commit -m "feat: add browser notification module"
```

---

### Task 7: Integrate alarm + notification into timer hook

**Files:**
- Modify: `src/hooks/use-timer.ts`

**Step 1: Import and call alarm + notification**

In `completeFocusAndStartBreak`, after `completeSession`:

```typescript
import { playAlarm, stopAlarm } from '@/lib/alarm';
import { sendTimerCompleteNotification } from '@/lib/notifications';
```

Inside `completeFocusAndStartBreak`:

```typescript
playAlarm();
sendTimerCompleteNotification(timer.task);
```

**Step 2: Stop alarm when break ends or user abandons**

In the break phase effect, when break reaches 0, call `stopAlarm()`.
In `abandonTimer`, call `stopAlarm()`.

**Step 3: Update `createActiveTimer` and `startTimer`**

Update to use `projects: ReadonlyArray<SessionProjectRef>` instead of single project fields.

**Step 4: Request notification permission**

Add a `useEffect` in the hook (or expose a function) that calls `requestNotificationPermission()` on mount:

```typescript
useEffect(() => {
    requestNotificationPermission();
}, []);
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: integrate alarm and notification into timer"
```

---

### Task 8: Update session-setup for multi-project selection

**Files:**
- Modify: `src/components/timer/session-setup.tsx`

**Step 1: Replace single Select with multi-select chips**

Replace `const [projectId, setProjectId] = useState('')` with `const [selectedProjectIds, setSelectedProjectIds] = useState<ReadonlyArray<string>>([])`.

UI: Show a list/grid of projects as clickable chips. Each chip shows the project color dot and name. Clicking toggles selection. Selected chips have an accent border/background.

`canStart` condition: `selectedProjectIds.length > 0 && task.trim() !== ''`

**Step 2: Update `handleSubmit`**

Pass `selectedProjectIds` to `startSession` instead of single `projectId`.

Build `StartTimerParams` with the array of projects:

```typescript
const selectedProjects = projects
    .filter((p) => selectedProjectIds.includes(p.id))
    .map((p) => ({ id: p.id, name: p.name, color: p.color }));
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: multi-project chip selector in session setup"
```

---

### Task 9: Update timer display and banner for multi-project

**Files:**
- Modify: `src/components/timer/timer-display.tsx`
- Modify: `src/components/timer/active-session-banner.tsx`
- Modify: `src/app/(app)/timer/timer-view.tsx`

**Step 1: Update `TimerDisplay` props**

Replace `projectName?: string` and `projectColor?: string` with:

```typescript
readonly projects?: ReadonlyArray<SessionProjectRef>;
```

Render multiple project dots+names:

```tsx
{projects && projects.length > 0 && (
    <div className="flex flex-wrap items-center justify-center gap-2">
        {projects.map((p) => (
            <div key={p.id} className="flex items-center gap-1">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} aria-hidden />
                <span className="text-sm text-[var(--text-secondary)]">{p.name}</span>
            </div>
        ))}
    </div>
)}
```

**Step 2: Update `ActiveSessionBanner`**

The banner reads from `loadTimer()` which returns `ActiveTimer`. Update to show multiple project names from `timer.projects`.

**Step 3: Update `TimerView`**

Pass `activeTimer.projects` instead of `activeTimer.projectName` / `activeTimer.projectColor` to `TimerDisplay`.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: update timer display and banner for multi-project"
```

---

### Task 10: Update session card and session list for multi-project

**Files:**
- Modify: `src/components/session/session-card.tsx`
- Modify: `src/components/session/session-list.tsx`
- Modify: `src/app/(app)/projects/[id]/project-detail-client.tsx`

**Step 1: Update `SessionCard`**

Change prop type from `SessionWithProject` to `SessionWithProjects`. Show multiple project dots/names instead of single.

**Step 2: Update `SessionList`**

Change prop type from `ReadonlyArray<SessionWithProject>` to `ReadonlyArray<SessionWithProjects>`.

**Step 3: Update `ProjectDetailClient`**

Change sessions prop type. Update session history rendering to use `SessionWithProjects`.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: update session card and project detail for multi-project"
```

---

### Task 11: Build, test, and final commit

**Step 1: Run build**

Run: `npm run build`
Expected: Clean build with no errors.

**Step 2: Run tests**

Run: `npm run test:run`
Expected: All tests pass. Fix any failures related to the type changes.

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve build/test issues from multi-project migration"
```
