# Session Edit & Delete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a three-dot menu to each session card with Edit (patch time, task, description) and Delete (with confirmation) actions.

**Architecture:** Two new server actions (`updateSession`, `deleteSession`) in `session-actions.ts`. A new `SessionCardMenu` client component renders the three-dot dropdown. Two new dialogs (`EditSessionDialog`, `DeleteSessionDialog`) are composed into `SessionCard`, which is converted to a client component to hold menu/dialog open state.

**Tech Stack:** Next.js 15, Drizzle ORM, TypeScript, Tailwind CSS, lucide-react, Vitest

---

### Task 1: Add `updateSession` server action

**Files:**
- Modify: `src/actions/session-actions.ts`

**Step 1: Add the action at the bottom of the file**

Read the file first, then append:

```ts
export async function updateSession(
    id: string,
    params: {
        task: string;
        description?: string;
        startedAt: Date;
        completedAt: Date;
    }
): Promise<ActionResult<FocusSession>> {
    const user = await requireAuth();

    const taskError = validateTask(params.task);
    if (taskError) {
        return { success: false, error: taskError };
    }

    if (params.completedAt <= params.startedAt) {
        return { success: false, error: 'End time must be after start time' };
    }

    const durationSeconds = Math.round(
        (params.completedAt.getTime() - params.startedAt.getTime()) / 1000
    );

    const [session] = await db
        .update(focusSessions)
        .set({
            task: params.task.trim(),
            description: params.description?.trim() || null,
            startedAt: params.startedAt,
            completedAt: params.completedAt,
            durationSeconds,
        })
        .where(
            and(
                eq(focusSessions.id, id),
                eq(focusSessions.userId, user.id)
            )
        )
        .returning();

    if (!session) {
        return { success: false, error: 'Session not found' };
    }

    revalidatePath('/log');
    return { success: true, data: session };
}
```

**Step 2: Run tests**

```bash
cd /Users/nrandriantsarafara/Works/sandbox/pomodoro && npx vitest run
```
Expected: All 24 tests pass.

**Step 3: Commit**

```bash
git add src/actions/session-actions.ts
git commit -m "feat: add updateSession server action"
```

---

### Task 2: Add `deleteSession` server action

**Files:**
- Modify: `src/actions/session-actions.ts`

**Step 1: Append to `session-actions.ts`**

```ts
export async function deleteSession(
    id: string
): Promise<ActionResult> {
    const user = await requireAuth();

    // Verify ownership
    const [session] = await db
        .select({ id: focusSessions.id })
        .from(focusSessions)
        .where(
            and(
                eq(focusSessions.id, id),
                eq(focusSessions.userId, user.id)
            )
        );

    if (!session) {
        return { success: false, error: 'Session not found' };
    }

    // Delete junction rows first (FK constraint)
    await db
        .delete(sessionProjects)
        .where(eq(sessionProjects.sessionId, id));

    await db
        .delete(focusSessions)
        .where(eq(focusSessions.id, id));

    revalidatePath('/log');
    return { success: true, data: undefined };
}
```

**Step 2: Run tests**

```bash
cd /Users/nrandriantsarafara/Works/sandbox/pomodoro && npx vitest run
```
Expected: All 24 tests pass.

**Step 3: Commit**

```bash
git add src/actions/session-actions.ts
git commit -m "feat: add deleteSession server action"
```

---

### Task 3: Build `EditSessionDialog` component

**Files:**
- Create: `src/components/session/edit-session-dialog.tsx`

**Step 1: Check what `Input` looks like**

```bash
cat src/components/ui/input.tsx
```

Note the props (especially `label`, `value`, `onChange`).

**Step 2: Create the component**

The time fields use `<input type="time">` pre-filled from the session's `startedAt`/`completedAt`. Times are stored as `HH:MM` strings in state and recombined with the session's date on submit.

```tsx
'use client';

import { useState, useCallback } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateSession } from '@/actions/session-actions';
import { TASK_MAX_LENGTH } from '@/lib/constants';
import type { SessionWithProjects } from '@/types';

interface EditSessionDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly session: SessionWithProjects;
}

function toTimeString(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function applyTimeToDate(base: Date, timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(base);
    result.setHours(hours, minutes, 0, 0);
    return result;
}

export function EditSessionDialog({ open, onClose, session }: EditSessionDialogProps) {
    const [task, setTask] = useState(session.task);
    const [description, setDescription] = useState(session.description ?? '');
    const [startTime, setStartTime] = useState(toTimeString(session.startedAt));
    const [endTime, setEndTime] = useState(
        session.completedAt ? toTimeString(session.completedAt) : toTimeString(session.startedAt)
    );
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canSubmit = task.trim() !== '' && !isSubmitting;

    const handleClose = useCallback(() => {
        setError(null);
        onClose();
    }, [onClose]);

    const handleSubmit = async () => {
        setError(null);
        if (!canSubmit) return;
        setIsSubmitting(true);

        const startedAt = applyTimeToDate(session.startedAt, startTime);
        const completedAt = applyTimeToDate(session.startedAt, endTime);

        const result = await updateSession(session.id, {
            task: task.trim(),
            description: description.trim() || undefined,
            startedAt,
            completedAt,
        });

        if (result.success) {
            handleClose();
        } else {
            setError(result.error);
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={open} onClose={handleClose} title="Edit session">
            <div className="flex flex-col gap-5">
                <Input
                    label="Task"
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    maxLength={TASK_MAX_LENGTH}
                    disabled={isSubmitting}
                    required
                />

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[var(--text-primary)]">
                        Description{' '}
                        <span className="text-[var(--text-secondary)] font-normal">(optional)</span>
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        disabled={isSubmitting}
                        className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--text-primary)]">
                            Start time
                        </label>
                        <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            disabled={isSubmitting}
                            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--text-primary)]">
                            End time
                        </label>
                        <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            disabled={isSubmitting}
                            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
                        />
                    </div>
                </div>

                {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

                <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    size="lg"
                    className="w-full"
                >
                    {isSubmitting ? 'Saving…' : 'Save changes'}
                </Button>
            </div>
        </Dialog>
    );
}
```

**Step 3: Run tests**

```bash
cd /Users/nrandriantsarafara/Works/sandbox/pomodoro && npx vitest run
```
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/components/session/edit-session-dialog.tsx
git commit -m "feat: add EditSessionDialog component"
```

---

### Task 4: Build `DeleteSessionDialog` component

**Files:**
- Create: `src/components/session/delete-session-dialog.tsx`

**Step 1: Create the component**

```tsx
'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { deleteSession } from '@/actions/session-actions';

interface DeleteSessionDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly sessionId: string;
}

export function DeleteSessionDialog({ open, onClose, sessionId }: DeleteSessionDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        setError(null);
        setIsDeleting(true);

        const result = await deleteSession(sessionId);

        if (!result.success) {
            setError(result.error);
            setIsDeleting(false);
        }
        // On success, the page revalidates — no need to call onClose manually
    };

    return (
        <Dialog open={open} onClose={onClose} title="Delete session">
            <div className="flex flex-col gap-5">
                <p className="text-sm text-[var(--text-secondary)]">
                    Delete this session? This cannot be undone.
                </p>

                {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        size="md"
                        className="flex-1"
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        size="md"
                        className="flex-1"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Deleting…' : 'Delete'}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
```

**Step 2: Run tests**

```bash
cd /Users/nrandriantsarafara/Works/sandbox/pomodoro && npx vitest run
```
Expected: All tests pass.

**Step 3: Commit**

```bash
git add src/components/session/delete-session-dialog.tsx
git commit -m "feat: add DeleteSessionDialog component"
```

---

### Task 5: Add three-dot menu and wire dialogs into `SessionCard`

**Files:**
- Modify: `src/components/session/session-card.tsx`

`SessionCard` is currently a client component (`'use client'`), so we can add state directly.

**Step 1: Read the current file**

Read `src/components/session/session-card.tsx` to understand the current structure.

**Step 2: Rewrite the component**

Add imports for `useState`, `MoreVertical` from lucide-react, `EditSessionDialog`, and `DeleteSessionDialog`. Add state for `menuOpen`, `editOpen`, `deleteOpen`. Add a three-dot button in the top-right of the card with a dropdown.

Replace the entire file content with:

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FOCUS_MODES } from '@/lib/constants';
import { EditSessionDialog } from './edit-session-dialog';
import { DeleteSessionDialog } from './delete-session-dialog';
import type { SessionWithProjects } from '@/types';
import type { BadgeVariant } from '@/components/ui/badge';

interface SessionCardProps {
    readonly session: SessionWithProjects;
}

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
    }
    return `${minutes}m`;
}

function formatTimeStarted(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

const FOCUS_MODE_BADGE_VARIANT: Record<
    SessionWithProjects['focusMode'],
    BadgeVariant
> = {
    short: 'short',
    average: 'average',
    deep: 'deep',
};

const STATUS_BADGE_VARIANT: Record<SessionWithProjects['status'], BadgeVariant> =
    {
        completed: 'completed',
        interrupted: 'interrupted',
        abandoned: 'abandoned',
    };

export function SessionCard({ session }: SessionCardProps) {
    const focusLabel = FOCUS_MODES[session.focusMode].label;
    const [menuOpen, setMenuOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuOpen]);

    return (
        <>
            <Card padding="md" className="animate-[fadeIn_0.3s_ease-out_forwards]">
                <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap flex-1">
                            {session.projects.map((p) => (
                                <span
                                    key={p.id}
                                    className="inline-flex items-center gap-1.5"
                                >
                                    <span
                                        className="h-2 w-2 shrink-0 rounded-full"
                                        style={{ backgroundColor: p.color }}
                                        aria-hidden
                                    />
                                    <span className="text-xs text-[var(--text-secondary)]">
                                        {p.name}
                                    </span>
                                </span>
                            ))}
                        </div>

                        {/* Three-dot menu */}
                        <div ref={menuRef} className="relative shrink-0">
                            <button
                                type="button"
                                onClick={() => setMenuOpen((v) => !v)}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--border)]/50 hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                                aria-label="Session options"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 top-8 z-10 min-w-[120px] rounded-lg border border-[var(--border)] bg-[#141416] py-1 shadow-lg">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            setEditOpen(true);
                                        }}
                                        className="w-full px-3 py-1.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--border)]/50"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            setDeleteOpen(true);
                                        }}
                                        className="w-full px-3 py-1.5 text-left text-sm text-[var(--danger)] hover:bg-[var(--border)]/50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <p className="text-sm font-medium text-[var(--text-primary)]">
                        {session.task}
                    </p>
                    {session.description && (
                        <p className="text-xs text-[var(--text-secondary)]">
                            {session.description}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={FOCUS_MODE_BADGE_VARIANT[session.focusMode]}>
                            {focusLabel}
                        </Badge>
                        <Badge variant={STATUS_BADGE_VARIANT[session.status]}>
                            {session.status}
                        </Badge>
                        <span className="text-xs text-[var(--text-secondary)]">
                            {formatDuration(session.durationSeconds)}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">
                            {formatTimeStarted(session.startedAt)}
                        </span>
                    </div>
                </div>
            </Card>

            <EditSessionDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                session={session}
            />
            <DeleteSessionDialog
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                sessionId={session.id}
            />
        </>
    );
}
```

**Step 3: Run tests**

```bash
cd /Users/nrandriantsarafara/Works/sandbox/pomodoro && npx vitest run
```
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/components/session/session-card.tsx
git commit -m "feat: add three-dot menu with edit and delete to session card"
```

---

### Task 6: Final verification

**Step 1: Run full test suite**

```bash
cd /Users/nrandriantsarafara/Works/sandbox/pomodoro && npx vitest run
```
Expected: All tests pass.

**Step 2: TypeScript check**

```bash
cd /Users/nrandriantsarafara/Works/sandbox/pomodoro && npx tsc --noEmit
```
Expected: No errors.

**Step 3: Manual smoke test**

1. Go to `/log` — each session card has a `⋯` button in the top-right
2. Click `⋯` → Edit → change task, description, start/end times → Save → card updates
3. Click `⋯` → Edit → set end time before start time → error shown
4. Click `⋯` → Delete → confirmation dialog → Cancel → session stays
5. Click `⋯` → Delete → Delete → session removed from list
