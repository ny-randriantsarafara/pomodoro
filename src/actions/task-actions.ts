'use server';

import { validateTaskTitle } from '@/lib/validators';
import type { Task, TaskStatus } from '@/lib/db/schema';
import type { ActionResult } from '@/types';

export type TaskStatusAction = 'complete' | 'archive';

interface NormalizedTaskInput {
    readonly title: string;
    readonly note: string | null;
    readonly dueDate: Date | null;
    readonly estimatedPomodoros: number | null;
}

function getFormString(formData: FormData, key: string): string {
    return String(formData.get(key) ?? '');
}

function parseOptionalDate(raw: string): Date | null {
    const trimmed = raw.trim();
    if (trimmed === '') return null;

    const parsed = new Date(`${trimmed}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error('Due date must be a valid date');
    }

    return parsed;
}

function parseEstimatedPomodoros(raw: string): number | null {
    const trimmed = raw.trim();
    if (trimmed === '') return null;

    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error('Estimated pomodoros must be at least 1');
    }

    return parsed;
}

export async function normalizeTaskInput(
    formData: FormData
): Promise<NormalizedTaskInput> {
    return {
        title: getFormString(formData, 'title').trim(),
        note: getFormString(formData, 'note').trim() || null,
        dueDate: parseOptionalDate(getFormString(formData, 'dueDate')),
        estimatedPomodoros: parseEstimatedPomodoros(
            getFormString(formData, 'estimatedPomodoros')
        ),
    };
}

export async function resolveTaskStatusAction(
    action: TaskStatusAction
): Promise<TaskStatus> {
    return action === 'complete' ? 'completed' : 'archived';
}

async function loadDependencies() {
    const [{ requireAuth }, { db }, schema, { and, desc, eq }, { revalidatePath }] =
        await Promise.all([
            import('@/lib/auth-utils'),
            import('@/lib/db'),
            import('@/lib/db/schema'),
            import('drizzle-orm'),
            import('next/cache'),
        ]);

    return {
        requireAuth,
        db,
        tasks: schema.tasks,
        and,
        desc,
        eq,
        revalidatePath,
    };
}

function revalidateTaskViews(revalidatePath: (path: string) => void): void {
    revalidatePath('/tasks');
    revalidatePath('/timer');
}

export async function createTask(
    formData: FormData
): Promise<ActionResult<Task>> {
    const { requireAuth, db, tasks, revalidatePath } = await loadDependencies();
    const user = await requireAuth();

    let input: NormalizedTaskInput;
    try {
        input = await normalizeTaskInput(formData);
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error ? error.message : 'Failed to parse task',
        };
    }

    const titleError = validateTaskTitle(input.title);
    if (titleError) {
        return { success: false, error: titleError };
    }

    const [task] = await db
        .insert(tasks)
        .values({
            userId: user.id,
            title: input.title,
            note: input.note,
            dueDate: input.dueDate,
            estimatedPomodoros: input.estimatedPomodoros,
        })
        .returning();

    revalidateTaskViews(revalidatePath);
    return { success: true, data: task };
}

export async function getTasks(): Promise<ReadonlyArray<Task>> {
    const { requireAuth, db, tasks, eq, desc } = await loadDependencies();
    const user = await requireAuth();

    return db
        .select()
        .from(tasks)
        .where(eq(tasks.userId, user.id))
        .orderBy(desc(tasks.updatedAt), desc(tasks.createdAt));
}

export async function updateTask(
    taskId: string,
    formData: FormData
): Promise<ActionResult<Task>> {
    const { requireAuth, db, tasks, and, eq, revalidatePath } =
        await loadDependencies();
    const user = await requireAuth();

    let input: NormalizedTaskInput;
    try {
        input = await normalizeTaskInput(formData);
    } catch (error) {
        return {
            success: false,
            error:
                error instanceof Error ? error.message : 'Failed to parse task',
        };
    }

    const titleError = validateTaskTitle(input.title);
    if (titleError) {
        return { success: false, error: titleError };
    }

    const [task] = await db
        .update(tasks)
        .set({
            title: input.title,
            note: input.note,
            dueDate: input.dueDate,
            estimatedPomodoros: input.estimatedPomodoros,
            updatedAt: new Date(),
        })
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
        .returning();

    if (!task) {
        return { success: false, error: 'Task not found' };
    }

    revalidateTaskViews(revalidatePath);
    return { success: true, data: task };
}

export async function updateTaskStatus(
    taskId: string,
    action: TaskStatusAction
): Promise<ActionResult<Task>> {
    const { requireAuth, db, tasks, and, eq, revalidatePath } =
        await loadDependencies();
    const user = await requireAuth();
    const status = await resolveTaskStatusAction(action);

    const [task] = await db
        .update(tasks)
        .set({
            status,
            updatedAt: new Date(),
        })
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
        .returning();

    if (!task) {
        return { success: false, error: 'Task not found' };
    }

    revalidateTaskViews(revalidatePath);
    return { success: true, data: task };
}
