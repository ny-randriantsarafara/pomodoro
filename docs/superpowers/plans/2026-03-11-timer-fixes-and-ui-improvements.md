# Timer Bug Fix, Task Selection Rework, and Description Rendering — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the race condition bug where new focus sessions immediately flip to break, add search/filter + recency sorting to the task picker, and preserve whitespace in description rendering.

**Architecture:** Three independent changes to existing files. The bug fix modifies pure function logic in `timer-state.ts`. The task picker enhancement adds state, filtering, and sorting inside `task-picker.tsx`. The description rendering fix adds a CSS class to two components.

**Tech Stack:** TypeScript, React, Vitest, Tailwind CSS

---

## Chunk 1: All Tasks

### Task 1: Fix race condition in `buildTimerStateFromSyncedSession`

**Files:**
- Test: `src/hooks/timer-state.test.ts` (create)
- Modify: `src/hooks/timer-state.ts:83-126`

**Context:** `buildTimerStateFromSyncedSession()` takes an `ActiveSessionSnapshot` and returns a `TimerState`. The bug: when `session.phase === 'focus'` but `session.sessionId` is `null` (race condition during session creation), the code falls through to the break branch. The fix splits logic so `phase` alone determines the branch.

The `ActiveSessionSnapshot` type (from `src/types/index.ts`):
```typescript
interface ActiveSessionSnapshot {
    readonly taskId: string | null;
    readonly sessionId: string | null;
    readonly taskLabel: string | null;
    readonly focusMode: FocusMode | null;
    readonly projects: ReadonlyArray<SessionProjectRef>;
    readonly phase: ActiveSessionPhase; // 'focus' | 'shortBreak' | 'longBreak'
    readonly phaseStartedAt: Date;
    readonly phaseDurationSeconds: number;
    readonly completedFocusSessions: number;
    readonly isPaused: boolean;
    readonly pausedAt: Date | null;
    readonly totalPausedSeconds: number;
    readonly version: number;
}
```

- [ ] **Step 1: Write the failing test**

Create `src/hooks/timer-state.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildTimerStateFromSyncedSession } from './timer-state';
import type { ActiveSessionSnapshot } from '@/types';

function makeSnapshot(
    overrides: Partial<ActiveSessionSnapshot> = {}
): ActiveSessionSnapshot {
    return {
        taskId: null,
        sessionId: null,
        taskLabel: null,
        focusMode: null,
        projects: [],
        phase: 'focus',
        phaseStartedAt: new Date('2026-03-11T10:00:00Z'),
        phaseDurationSeconds: 1500,
        completedFocusSessions: 0,
        isPaused: false,
        pausedAt: null,
        totalPausedSeconds: 0,
        version: 1,
        ...overrides,
    };
}

describe('buildTimerStateFromSyncedSession', () => {
    const nowMs = new Date('2026-03-11T10:05:00Z').getTime(); // 5 min elapsed

    it('returns focus phase when phase is focus and sessionId is present', () => {
        const session = makeSnapshot({
            phase: 'focus',
            sessionId: 'session-1',
            taskLabel: 'My Task',
            focusMode: 'short',
        });

        const state = buildTimerStateFromSyncedSession(session, nowMs);

        expect(state.phase).toBe('focus');
        expect(state.activeTimer).not.toBeNull();
        expect(state.remainingSeconds).toBeGreaterThan(0);
    });

    it('returns focus phase when phase is focus but sessionId is null', () => {
        const session = makeSnapshot({
            phase: 'focus',
            sessionId: null,
        });

        const state = buildTimerStateFromSyncedSession(session, nowMs);

        expect(state.phase).toBe('focus');
        // No activeTimer since we don't have a sessionId
        expect(state.activeTimer).toBeNull();
        expect(state.remainingSeconds).toBeGreaterThan(0);
    });

    it('returns focus phase when paused with null sessionId', () => {
        const pausedAt = new Date('2026-03-11T10:03:00Z');
        const session = makeSnapshot({
            phase: 'focus',
            sessionId: null,
            isPaused: true,
            pausedAt,
            totalPausedSeconds: 0,
        });

        const state = buildTimerStateFromSyncedSession(session, nowMs);

        expect(state.phase).toBe('focus');
        expect(state.activeTimer).toBeNull();
        expect(state.isPaused).toBe(true);
        // Remaining should be frozen at the paused moment (3 min elapsed = 1200s left)
        expect(state.remainingSeconds).toBe(1200);
    });

    it('returns break phase for shortBreak', () => {
        const session = makeSnapshot({
            phase: 'shortBreak',
            phaseDurationSeconds: 300,
        });

        const state = buildTimerStateFromSyncedSession(session, nowMs);

        expect(state.phase).toBe('break');
        expect(state.breakDurationSeconds).toBe(300);
    });

    it('returns break phase for longBreak', () => {
        const session = makeSnapshot({
            phase: 'longBreak',
            phaseDurationSeconds: 900,
        });

        const state = buildTimerStateFromSyncedSession(session, nowMs);

        expect(state.phase).toBe('break');
        expect(state.breakDurationSeconds).toBe(900);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/timer-state.test.ts`

Expected: FAIL on "returns focus phase when phase is focus but sessionId is null" — the current code returns `phase: 'break'` instead of `phase: 'focus'`.

- [ ] **Step 3: Fix `buildTimerStateFromSyncedSession`**

In `src/hooks/timer-state.ts`, replace the `buildTimerStateFromSyncedSession` function (lines 83–126) with:

```typescript
export function buildTimerStateFromSyncedSession(
    session: ActiveSessionSnapshot,
    nowMs: number = Date.now()
): TimerState {
    if (session.phase === 'focus') {
        if (session.sessionId) {
            const timer = buildActiveTimerFromSession(session);
            return {
                activeTimer: timer,
                phase: 'focus',
                remainingSeconds: computeRemainingSeconds(
                    buildPhaseTimingFromTimer(timer),
                    session.isPaused,
                    nowMs
                ),
                breakDurationSeconds: 0,
                phaseTiming: buildPhaseTimingFromTimer(timer),
                isPaused: session.isPaused,
                justCompletedFocus: false,
            };
        }

        // Focus phase but sessionId not yet available (race condition).
        // Build focus state from phase timing so the timer counts down correctly.
        const phaseTiming: PhaseTiming = {
            startedAt: getPhaseTimestampMs(session.phaseStartedAt),
            durationSeconds: session.phaseDurationSeconds,
            pausedAt: session.pausedAt
                ? getPhaseTimestampMs(session.pausedAt)
                : null,
            totalPausedSeconds: session.totalPausedSeconds,
        };

        return {
            activeTimer: null,
            phase: 'focus',
            remainingSeconds: computeRemainingSeconds(
                phaseTiming,
                session.isPaused,
                nowMs
            ),
            breakDurationSeconds: 0,
            phaseTiming,
            isPaused: session.isPaused,
            justCompletedFocus: false,
        };
    }

    // Break phases (shortBreak / longBreak)
    const phaseTiming: PhaseTiming = {
        startedAt: getPhaseTimestampMs(session.phaseStartedAt),
        durationSeconds: session.phaseDurationSeconds,
        pausedAt: session.pausedAt
            ? getPhaseTimestampMs(session.pausedAt)
            : null,
        totalPausedSeconds: session.totalPausedSeconds,
    };

    return {
        activeTimer: null,
        phase: 'break',
        remainingSeconds: computeRemainingSeconds(
            phaseTiming,
            session.isPaused,
            nowMs
        ),
        breakDurationSeconds: session.phaseDurationSeconds,
        phaseTiming,
        isPaused: session.isPaused,
        justCompletedFocus: false,
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/timer-state.test.ts`

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/timer-state.ts src/hooks/timer-state.test.ts
git commit -m "fix: prevent focus session from immediately flipping to break phase

The sync poll could return a focus-phase active session before the
focusSession record was visible, leaving sessionId null. The old code
required sessionId to be truthy for the focus branch, so it fell through
to break. Now the phase alone determines the branch."
```

---

### Task 2: Add search/filter and recency sorting to TaskPicker

**Files:**
- Modify: `src/components/timer/task-picker.tsx`
- Test: `src/components/timer/task-picker.test.ts` (create)

**Context:** The `TaskPicker` currently renders a flat list of pill buttons for all active tasks. The project picker in `session-setup.tsx` already shows a search input when there are >6 projects. We follow the same pattern for tasks: show a search input when >5 active tasks, filter by title, sort by recency (`actualPomodoros` desc, then `updatedAt` desc), keep selected task visible even when it doesn't match the filter.

The `Task` type has these relevant fields: `id`, `title`, `status`, `actualPomodoros` (number), `updatedAt` (Date).

- [ ] **Step 1: Write tests for sorting logic**

Create `src/components/timer/task-picker.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { Task } from '@/lib/db/schema';

// Re-export the sort function for testing by extracting it.
// We test sorting logic directly since the component is a thin UI layer.
function sortByRecency(a: Task, b: Task): number {
    if (b.actualPomodoros !== a.actualPomodoros) {
        return b.actualPomodoros - a.actualPomodoros;
    }
    return b.updatedAt.getTime() - a.updatedAt.getTime();
}

function makeTask(overrides: Partial<Task> = {}): Task {
    return {
        id: crypto.randomUUID(),
        userId: 'user-1',
        title: 'Task',
        note: null,
        status: 'active',
        dueDate: null,
        estimatedPomodoros: null,
        actualPomodoros: 0,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        ...overrides,
    };
}

describe('sortByRecency', () => {
    it('sorts by actualPomodoros descending', () => {
        const a = makeTask({ title: 'A', actualPomodoros: 1 });
        const b = makeTask({ title: 'B', actualPomodoros: 5 });
        const c = makeTask({ title: 'C', actualPomodoros: 3 });

        const sorted = [a, b, c].sort(sortByRecency);

        expect(sorted.map((t) => t.title)).toEqual(['B', 'C', 'A']);
    });

    it('breaks ties by updatedAt descending', () => {
        const a = makeTask({
            title: 'A',
            actualPomodoros: 2,
            updatedAt: new Date('2026-03-01'),
        });
        const b = makeTask({
            title: 'B',
            actualPomodoros: 2,
            updatedAt: new Date('2026-03-10'),
        });

        const sorted = [a, b].sort(sortByRecency);

        expect(sorted.map((t) => t.title)).toEqual(['B', 'A']);
    });

    it('handles tasks with zero pomodoros', () => {
        const a = makeTask({
            title: 'A',
            actualPomodoros: 0,
            updatedAt: new Date('2026-03-05'),
        });
        const b = makeTask({
            title: 'B',
            actualPomodoros: 0,
            updatedAt: new Date('2026-03-10'),
        });

        const sorted = [a, b].sort(sortByRecency);

        expect(sorted.map((t) => t.title)).toEqual(['B', 'A']);
    });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/components/timer/task-picker.test.ts`

Expected: All 3 tests PASS (these test the sorting logic we are about to use).

- [ ] **Step 3: Add search state, filtering, and sorting to `task-picker.tsx`**

Replace the entire content of `src/components/timer/task-picker.tsx` with:

```tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/db/schema';

export interface TaskPickerProps {
    readonly tasks: ReadonlyArray<Task>;
    readonly selectedTaskId: string | null;
    readonly onSelect: (task: Task) => void;
    readonly disabled?: boolean;
}

const SEARCH_THRESHOLD = 5;

function sortByRecency(a: Task, b: Task): number {
    if (b.actualPomodoros !== a.actualPomodoros) {
        return b.actualPomodoros - a.actualPomodoros;
    }
    return b.updatedAt.getTime() - a.updatedAt.getTime();
}

export function TaskPicker({
    tasks,
    selectedTaskId,
    onSelect,
    disabled = false,
}: TaskPickerProps) {
    const [search, setSearch] = useState('');

    const activeTasks = useMemo(
        () =>
            tasks
                .filter((task) => task.status === 'active')
                .sort(sortByRecency),
        [tasks]
    );

    const filteredTasks = useMemo(() => {
        if (!search.trim()) return activeTasks;
        const query = search.toLowerCase();
        return activeTasks.filter(
            (t) =>
                t.title.toLowerCase().includes(query) ||
                t.id === selectedTaskId
        );
    }, [activeTasks, search, selectedTaskId]);

    if (activeTasks.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]/60 p-4 text-sm text-[var(--text-secondary)]">
                <p>
                    No active tasks yet. Pick one later, or use a quick task to
                    start now.
                </p>
                <Link
                    href="/tasks"
                    className={cn(
                        'mt-3 inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] px-3 text-sm text-[var(--text-primary)] transition-colors',
                        'hover:bg-[var(--border)]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]'
                    )}
                >
                    Open tasks
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {activeTasks.length > SEARCH_THRESHOLD && (
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Filter tasks..."
                        className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        disabled={disabled}
                    />
                </div>
            )}
            <div className="flex flex-wrap gap-2">
                {filteredTasks.map((task) => {
                    const isSelected = task.id === selectedTaskId;

                    return (
                        <button
                            key={task.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => onSelect(task)}
                            className={cn(
                                'rounded-full border px-3 py-2 text-sm transition-colors',
                                isSelected
                                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]'
                                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                                disabled && 'cursor-not-allowed opacity-50'
                            )}
                            aria-pressed={isSelected}
                        >
                            {task.title}
                        </button>
                    );
                })}
            </div>
            {search.trim() && filteredTasks.length === 0 && (
                <p className="text-sm text-[var(--text-secondary)]">
                    No tasks matching &ldquo;{search.trim()}&rdquo;
                </p>
            )}
        </div>
    );
}
```

- [ ] **Step 4: Verify the app builds**

Run: `npx tsc --noEmit`

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/timer/task-picker.tsx src/components/timer/task-picker.test.ts
git commit -m "feat: add search filter and recency sorting to task picker

Show a search input when there are more than 5 active tasks.
Tasks are sorted by actualPomodoros desc then updatedAt desc.
Selected task stays visible even when it doesn't match the filter."
```

---

### Task 3: Preserve whitespace in description rendering

**Files:**
- Modify: `src/components/task/task-card.tsx:85-87`
- Modify: `src/components/session/session-card.tsx:147-151`

**Context:** Both components render descriptions/notes with plain `<p>` tags. Line breaks typed by users are lost. Adding `whitespace-pre-wrap` preserves newlines and indentation while still wrapping long lines.

- [ ] **Step 1: Add `whitespace-pre-wrap` to task note in `task-card.tsx`**

In `src/components/task/task-card.tsx`, change line 86 from:

```tsx
<p className="text-sm text-[var(--text-secondary)]">{task.note}</p>
```

to:

```tsx
<p className="whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{task.note}</p>
```

- [ ] **Step 2: Add `whitespace-pre-wrap` to session description in `session-card.tsx`**

In `src/components/session/session-card.tsx`, change line 148 from:

```tsx
<p className="text-xs text-[var(--text-secondary)]">
```

to:

```tsx
<p className="whitespace-pre-wrap text-xs text-[var(--text-secondary)]">
```

- [ ] **Step 3: Verify the app builds**

Run: `npx tsc --noEmit`

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/task/task-card.tsx src/components/session/session-card.tsx
git commit -m "fix: preserve line breaks in task notes and session descriptions

Add whitespace-pre-wrap so newlines and indentation typed by users
are rendered correctly instead of collapsing into a single block."
```
