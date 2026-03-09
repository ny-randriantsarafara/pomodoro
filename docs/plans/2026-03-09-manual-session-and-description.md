# Manual Session Entry & Task Description Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the ability to log forgotten sessions from the daily log page, and add an optional description field to sessions.

**Architecture:** Add a nullable `description` column to `focus_sessions` via a new Drizzle migration, thread it through the `startSession` action and a new `addManualSession` action, expose it in the `SessionSetup` form and a new `AddSessionDialog`, and render it on `SessionCard`.

**Tech Stack:** Next.js 15, Drizzle ORM, PostgreSQL, TypeScript, Tailwind CSS, Vitest

---

### Task 1: Add `description` column — DB migration

**Files:**
- Create: `drizzle/0003_add_session_description.sql`
- Modify: `src/lib/db/schema.ts` (find the `focusSessions` table definition, add `description` field)

**Step 1: Write the failing schema test**

Open `src/lib/db/schema.test.ts` and add inside the `'defines focus_sessions table'` test:

```ts
expect(columns).toContain('description');
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/db/schema.test.ts
```
Expected: FAIL — `Expected array to contain 'description'`

**Step 3: Add the column to the schema**

In `src/lib/db/schema.ts`, find the `focusSessions` table definition (look for `export const focusSessions = pgTable(...)`). Add after the `task` column:

```ts
description: text('description'),
```

**Step 4: Create the SQL migration file**

Create `drizzle/0003_add_session_description.sql`:

```sql
ALTER TABLE "focus_sessions" ADD COLUMN "description" text;
```

**Step 5: Run test to verify it passes**

```bash
npx vitest run src/lib/db/schema.test.ts
```
Expected: PASS

**Step 6: Apply migration to local DB**

```bash
npx drizzle-kit migrate
```
Expected: Migration applied successfully.

**Step 7: Commit**

```bash
git add drizzle/0003_add_session_description.sql src/lib/db/schema.ts src/lib/db/schema.test.ts
git commit -m "feat: add description column to focus_sessions"
```

---

### Task 2: Update types and `startSession` action

**Files:**
- Modify: `src/types/index.ts` — add `description` to `SessionWithProjects`
- Modify: `src/actions/session-actions.ts` — accept and persist `description` in `startSession`, select it in queries

**Step 1: Update `SessionWithProjects` type**

In `src/types/index.ts`, add to the `SessionWithProjects` interface:

```ts
readonly description: string | null;
```

**Step 2: Update `startSession` action signature**

In `src/actions/session-actions.ts`, update `startSession`:

```ts
export async function startSession(
    projectIds: ReadonlyArray<string>,
    task: string,
    focusMode: FocusMode,
    description?: string
): Promise<ActionResult<FocusSession>>
```

In the `.values({...})` call, add:

```ts
description: description?.trim() || null,
```

**Step 3: Update `getSessionsByDate` and `getSessionsByProject` selects**

Both functions build a `select({...})` object. Add `description` to each:

```ts
description: focusSessions.description,
```

**Step 4: Run existing tests**

```bash
npx vitest run
```
Expected: All tests pass (no type errors in test files).

**Step 5: Commit**

```bash
git add src/types/index.ts src/actions/session-actions.ts
git commit -m "feat: thread description through startSession and session queries"
```

---

### Task 3: Add `addManualSession` server action

**Files:**
- Modify: `src/actions/session-actions.ts` — add new exported action

**Step 1: Add the action at the bottom of `session-actions.ts`**

```ts
export async function addManualSession(params: {
    task: string;
    focusMode: FocusMode;
    projectIds: ReadonlyArray<string>;
    description?: string;
    date: Date;
}): Promise<ActionResult<FocusSession>> {
    const user = await requireAuth();

    const taskError = validateTask(params.task);
    if (taskError) {
        return { success: false, error: taskError };
    }

    if (!(params.focusMode in FOCUS_MODES)) {
        return { success: false, error: 'Invalid focus mode' };
    }

    const durationSeconds = FOCUS_MODES[params.focusMode].workMinutes * 60;

    const startedAt = new Date(params.date);
    startedAt.setSeconds(0, 0);

    const completedAt = new Date(startedAt.getTime() + durationSeconds * 1000);

    const [session] = await db
        .insert(focusSessions)
        .values({
            userId: user.id,
            focusMode: params.focusMode,
            task: params.task.trim(),
            description: params.description?.trim() || null,
            startedAt,
            completedAt,
            durationSeconds,
            status: 'completed',
        })
        .returning();

    if (!session) {
        return { success: false, error: 'Failed to create session' };
    }

    if (params.projectIds.length > 0) {
        await db.insert(sessionProjects).values(
            params.projectIds.map((pid) => ({
                sessionId: session.id,
                projectId: pid,
            }))
        );
    }

    revalidatePath('/log');
    return { success: true, data: session };
}
```

**Step 2: Run tests**

```bash
npx vitest run
```
Expected: PASS

**Step 3: Commit**

```bash
git add src/actions/session-actions.ts
git commit -m "feat: add addManualSession server action"
```

---

### Task 4: Add description field to `SessionSetup` (timer start form)

**Files:**
- Modify: `src/components/timer/session-setup.tsx`

**Step 1: Add `description` state and textarea**

In `src/components/timer/session-setup.tsx`:

1. Add state after `task` state:
```ts
const [description, setDescription] = useState('');
```

2. Pass description to `startSession` call:
```ts
const result = await startSession(selectedIds, trimmedTask, focusMode, description.trim() || undefined);
```

3. Add textarea after the `<Input label="Task" .../>` block and before the error paragraph:
```tsx
<div className="flex flex-col gap-2">
    <label className="text-sm font-medium text-[var(--text-primary)]">
        Description{' '}
        <span className="text-[var(--text-secondary)] font-normal">(optional)</span>
    </label>
    <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What specifically are you doing?"
        rows={2}
        disabled={isSubmitting}
        className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
    />
</div>
```

**Step 2: Verify in browser**

Start dev server (`npm run dev`), go to `/timer` — you should see the description textarea below the task input.

**Step 3: Commit**

```bash
git add src/components/timer/session-setup.tsx
git commit -m "feat: add optional description textarea to timer session setup"
```

---

### Task 5: Show description on `SessionCard`

**Files:**
- Modify: `src/components/session/session-card.tsx`

**Step 1: Add description rendering**

In `SessionCard`, after the `<p className="text-sm font-medium ...">` that shows `session.task`, add:

```tsx
{session.description && (
    <p className="text-xs text-[var(--text-secondary)]">
        {session.description}
    </p>
)}
```

**Step 2: Verify in browser**

Go to `/log` — sessions with a description should show it below the task title.

**Step 3: Commit**

```bash
git add src/components/session/session-card.tsx
git commit -m "feat: display session description on session card"
```

---

### Task 6: Build `AddSessionDialog` component

**Files:**
- Create: `src/components/session/add-session-dialog.tsx`

**Step 1: Create the component**

```tsx
'use client';

import { useState, useCallback, useMemo } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModeSelector } from '@/components/timer/mode-selector';
import { addManualSession } from '@/actions/session-actions';
import { TASK_MAX_LENGTH } from '@/lib/constants';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/db/schema';
import type { FocusMode } from '@/lib/db/schema';

interface AddSessionDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly date: Date;
    readonly projects: ReadonlyArray<Project>;
}

export function AddSessionDialog({ open, onClose, date, projects }: AddSessionDialogProps) {
    const [task, setTask] = useState('');
    const [description, setDescription] = useState('');
    const [focusMode, setFocusMode] = useState<FocusMode>('short');
    const [selectedIds, setSelectedIds] = useState<ReadonlyArray<string>>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canSubmit = task.trim() !== '' && !isSubmitting;

    const toggleProject = useCallback((id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
        );
    }, []);

    const handleClose = useCallback(() => {
        setTask('');
        setDescription('');
        setFocusMode('short');
        setSelectedIds([]);
        setError(null);
        onClose();
    }, [onClose]);

    const handleSubmit = async () => {
        setError(null);
        if (!canSubmit) return;
        setIsSubmitting(true);

        const result = await addManualSession({
            task: task.trim(),
            description: description.trim() || undefined,
            focusMode,
            projectIds: selectedIds,
            date,
        });

        if (result.success) {
            handleClose();
        } else {
            setError(result.error);
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={open} onClose={handleClose} title="Add session">
            <div className="flex flex-col gap-5">
                {/* Projects */}
                {projects.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--text-primary)]">
                            Projects{' '}
                            <span className="text-[var(--text-secondary)] font-normal">(optional)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {projects.map((p) => {
                                const isSelected = selectedIds.includes(p.id);
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => toggleProject(p.id)}
                                        className={cn(
                                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                                            isSelected
                                                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]'
                                                : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]',
                                            isSubmitting && 'cursor-not-allowed opacity-50'
                                        )}
                                    >
                                        <span
                                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                                            style={{ backgroundColor: p.color }}
                                            aria-hidden
                                        />
                                        <span className="truncate">{p.name}</span>
                                        {isSelected && (
                                            <X className="h-3 w-3 shrink-0 text-[var(--text-secondary)]" aria-hidden />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Task */}
                <Input
                    label="Task"
                    placeholder="What did you work on?"
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    maxLength={TASK_MAX_LENGTH}
                    disabled={isSubmitting}
                    required
                />

                {/* Description */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[var(--text-primary)]">
                        Description{' '}
                        <span className="text-[var(--text-secondary)] font-normal">(optional)</span>
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Any extra details?"
                        rows={2}
                        disabled={isSubmitting}
                        className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
                    />
                </div>

                {/* Focus mode */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[var(--text-primary)]">
                        Focus mode
                    </label>
                    <ModeSelector
                        selectedMode={focusMode}
                        onSelect={setFocusMode}
                        disabled={isSubmitting}
                    />
                </div>

                {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

                <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    size="lg"
                    className="w-full"
                >
                    {isSubmitting ? 'Adding…' : 'Add session'}
                </Button>
            </div>
        </Dialog>
    );
}
```

**Step 2: Run tests**

```bash
npx vitest run
```
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/session/add-session-dialog.tsx
git commit -m "feat: add AddSessionDialog component for manual session entry"
```

---

### Task 7: Wire `AddSessionDialog` into the log page

**Files:**
- Modify: `src/app/(app)/log/page.tsx` — fetch projects, pass to a new client wrapper
- Create: `src/components/session/log-header.tsx` — client component with "Add session" button + dialog

The log page is a server component, so we need a thin client wrapper to hold dialog state.

**Step 1: Create `LogHeader` client component**

Create `src/components/session/log-header.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from './date-picker';
import { AddSessionDialog } from './add-session-dialog';
import type { Project } from '@/lib/db/schema';

interface LogHeaderProps {
    readonly currentDate: Date;
    readonly projects: ReadonlyArray<Project>;
}

export function LogHeader({ currentDate, projects }: LogHeaderProps) {
    const [dialogOpen, setDialogOpen] = useState(false);

    return (
        <>
            <div className="flex items-center gap-3">
                <DatePicker currentDate={currentDate} />
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setDialogOpen(true)}
                    className="inline-flex items-center gap-1.5"
                >
                    <Plus className="h-4 w-4" aria-hidden />
                    Add session
                </Button>
            </div>
            <AddSessionDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                date={currentDate}
                projects={projects}
            />
        </>
    );
}
```

**Step 2: Update log page to fetch projects and use `LogHeader`**

In `src/app/(app)/log/page.tsx`:

1. Import `getUserProjects` (it exists in `src/actions/project-actions.ts` — check the exact export name first).
2. Import `LogHeader`.
3. Fetch projects alongside sessions and summary.
4. Replace `<DatePicker currentDate={date} />` with `<LogHeader currentDate={date} projects={projects} />`.

Check the project action first:

```bash
grep -n "export async function" src/actions/project-actions.ts
```

Then update the page:

```tsx
import { getSessionsByDate, getDailyLogSummary } from '@/actions/session-actions';
import { getUserProjects } from '@/actions/project-actions'; // adjust name if different
import { LogHeader } from '@/components/session/log-header';
import { DailySummary } from '@/components/session/daily-summary';
import { SessionList } from '@/components/session/session-list';

// ...parseDateParam unchanged...

export default async function LogPage({ searchParams }: LogPageProps) {
    const params = await searchParams;
    const date = parseDateParam(params.date);

    const [sessions, summary, projects] = await Promise.all([
        getSessionsByDate(date),
        getDailyLogSummary(date),
        getUserProjects(), // adjust if different name
    ]);

    return (
        <div className="mx-auto max-w-4xl flex flex-col gap-6 p-6 lg:p-10">
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-[var(--text-primary)]">
                Daily Log
            </h1>
            <LogHeader currentDate={date} projects={projects} />
            <DailySummary summary={summary} />
            <SessionList sessions={sessions} />
        </div>
    );
}
```

**Step 3: Check the Button component supports `variant="secondary"`**

```bash
grep -n "secondary" src/components/ui/button.tsx
```

If not supported, use whichever variant makes visual sense (e.g., `variant="ghost"` or just default).

**Step 4: Verify in browser**

Go to `/log` — you should see an "Add session" button next to the date picker. Clicking it opens the dialog. Submitting a session should close the dialog and refresh the list.

**Step 5: Commit**

```bash
git add src/components/session/log-header.tsx src/app/(app)/log/page.tsx
git commit -m "feat: wire AddSessionDialog into log page with Add session button"
```

---

### Task 8: Final verification

**Step 1: Run full test suite**

```bash
npx vitest run
```
Expected: All tests pass.

**Step 2: Manual smoke test**

1. Go to `/timer` — start a session, confirm description textarea is visible and optional.
2. Start a session with a description. Check `/log` — session card should show the description.
3. Start a session without a description. Session card shows only the task.
4. Go to `/log` — click "Add session", fill in task + focus mode, submit. Session appears in the list.
5. Add another manual session with a description — confirm it shows on the card.

**Step 3: Final commit if any fixes needed, otherwise done.**
