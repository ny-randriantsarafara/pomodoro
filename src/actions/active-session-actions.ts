'use server';

import { DEFAULT_TIMER_SETTINGS } from '@/lib/settings';
import {
    ACTIVE_SESSION_ALREADY_EXISTS_ERROR,
    ACTIVE_SESSION_NOT_FOUND_ERROR,
    ACTIVE_SESSION_VERSION_ERROR,
    buildActiveSessionActionUpdate,
    buildActiveSessionSnapshot,
    getPhaseDurationSeconds,
} from '@/lib/active-session-utils';
import type {
    ActiveSessionAction,
    ActiveSessionRecord,
} from '@/lib/active-session-utils';
import type { ActionResult, ActiveSessionSnapshot, TimerSettings } from '@/types';
import type {
    ActiveSessionPhase,
    FocusMode,
    Task,
} from '@/lib/db/schema';
import type { SessionProjectRef } from '@/types';

interface ActiveSessionMetadata {
    readonly sessionId: string | null;
    readonly taskLabel: string | null;
    readonly focusMode: FocusMode | null;
    readonly projects: ReadonlyArray<SessionProjectRef>;
}

async function loadDependencies() {
    const [
        { requireAuth },
        { db },
        schema,
        { and, desc, eq, isNull },
        { revalidatePath },
    ] =
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
        activeSessions: schema.activeSessions,
        focusSessions: schema.focusSessions,
        projects: schema.projects,
        sessionProjects: schema.sessionProjects,
        tasks: schema.tasks,
        userSettings: schema.userSettings,
        and,
        desc,
        eq,
        isNull,
        revalidatePath,
    };
}

async function getTimerSettingsForUser(userId: string): Promise<TimerSettings> {
    const { db, userSettings, eq } = await loadDependencies();
    const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId));

    if (!settings) {
        return DEFAULT_TIMER_SETTINGS;
    }

    return {
        workMinutes: settings.workMinutes,
        shortBreakMinutes: settings.shortBreakMinutes,
        longBreakMinutes: settings.longBreakMinutes,
        longBreakFrequency: settings.longBreakFrequency,
        autoStartBreaks: settings.autoStartBreaks,
        autoStartFocusSessions: settings.autoStartFocusSessions,
    };
}

async function getActiveSessionMetadata(
    userId: string,
    taskId: string | null | undefined
): Promise<ActiveSessionMetadata> {
    const {
        db,
        focusSessions,
        projects,
        sessionProjects,
        tasks,
        and,
        desc,
        eq,
        isNull,
    } =
        await loadDependencies();

    const [focusSession] = await db
        .select({
            id: focusSessions.id,
            task: focusSessions.task,
            focusMode: focusSessions.focusMode,
        })
        .from(focusSessions)
        .where(
            and(
                eq(focusSessions.userId, userId),
                isNull(focusSessions.completedAt)
            )
        )
        .orderBy(desc(focusSessions.startedAt))
        .limit(1);

    if (focusSession) {
        const projectRows = await db
            .select({
                id: projects.id,
                name: projects.name,
                color: projects.color,
            })
            .from(sessionProjects)
            .innerJoin(projects, eq(sessionProjects.projectId, projects.id))
            .where(eq(sessionProjects.sessionId, focusSession.id));

        return {
            sessionId: focusSession.id,
            taskLabel: focusSession.task,
            focusMode: focusSession.focusMode,
            projects: projectRows,
        };
    }

    if (!taskId) {
        return {
            sessionId: null,
            taskLabel: null,
            focusMode: null,
            projects: [],
        };
    }

    const [task] = await db
        .select({
            title: tasks.title,
        })
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
        .limit(1);

    return {
        sessionId: null,
        taskLabel: task?.title ?? null,
        focusMode: null,
        projects: [],
    };
}

async function findOwnedTask(
    userId: string,
    taskId: string
): Promise<Pick<Task, 'id'> | null> {
    const { db, tasks, and, eq } = await loadDependencies();
    const [task] = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
        .limit(1);

    return task ?? null;
}

async function hydrateActiveSessionSnapshot(
    userId: string,
    session: ActiveSessionRecord | null
): Promise<ActiveSessionSnapshot | null> {
    if (!session) {
        return null;
    }

    const metadata = await getActiveSessionMetadata(userId, session.taskId);
    return buildActiveSessionSnapshot(session, metadata);
}

export async function getActiveSession(): Promise<
    ActionResult<ActiveSessionSnapshot | null>
> {
    const { requireAuth, db, activeSessions, eq } = await loadDependencies();
    const user = await requireAuth();
    const [session] = await db
        .select()
        .from(activeSessions)
        .where(eq(activeSessions.userId, user.id));

    return {
        success: true,
        data: await hydrateActiveSessionSnapshot(user.id, session ?? null),
    };
}

export async function createActiveSession(params: {
    readonly taskId?: string | null;
    readonly phase?: ActiveSessionPhase;
    readonly phaseStartedAt?: Date;
    readonly phaseDurationSeconds?: number;
    readonly completedFocusSessions?: number;
}): Promise<ActionResult<ActiveSessionSnapshot>> {
    const { requireAuth, db, activeSessions, eq, revalidatePath } =
        await loadDependencies();
    const user = await requireAuth();

    if (params.taskId) {
        const ownedTask = await findOwnedTask(user.id, params.taskId);
        if (!ownedTask) {
            return {
                success: false,
                error: 'Task not found.',
            };
        }
    }

    const [existing] = await db
        .select()
        .from(activeSessions)
        .where(eq(activeSessions.userId, user.id));

    if (existing) {
        return {
            success: false,
            error: ACTIVE_SESSION_ALREADY_EXISTS_ERROR,
        };
    }

    const settings = await getTimerSettingsForUser(user.id);
    const [session] = await db
        .insert(activeSessions)
        .values({
            userId: user.id,
            taskId: params.taskId ?? null,
            phase: params.phase ?? 'focus',
            phaseStartedAt: params.phaseStartedAt ?? new Date(),
            phaseDurationSeconds:
                params.phaseDurationSeconds ??
                getPhaseDurationSeconds(params.phase ?? 'focus', settings),
            completedFocusSessions: params.completedFocusSessions ?? 0,
        })
        .returning();

    if (!session) {
        return {
            success: false,
            error: 'Failed to create active session.',
        };
    }

    revalidatePath('/timer');
    return {
        success: true,
        data: (await hydrateActiveSessionSnapshot(user.id, session))!,
    };
}

export async function applyActiveSessionAction(params: {
    readonly action: ActiveSessionAction;
    readonly expectedVersion: number;
    readonly now?: Date;
}): Promise<ActionResult<ActiveSessionSnapshot | null>> {
    const {
        requireAuth,
        db,
        activeSessions,
        and,
        eq,
        revalidatePath,
    } = await loadDependencies();
    const user = await requireAuth();

    const [session] = await db
        .select()
        .from(activeSessions)
        .where(eq(activeSessions.userId, user.id));

    if (!session) {
        return {
            success: false,
            error: ACTIVE_SESSION_NOT_FOUND_ERROR,
        };
    }

    const settings = await getTimerSettingsForUser(user.id);
    const update = buildActiveSessionActionUpdate({
        session,
        action: params.action,
        expectedVersion: params.expectedVersion,
        now: params.now ?? new Date(),
        settings,
    });

    if (!update.success) {
        return update;
    }

    if (update.deleteActiveSession) {
        const [deleted] = await db
            .delete(activeSessions)
            .where(
                and(
                    eq(activeSessions.userId, user.id),
                    eq(activeSessions.version, params.expectedVersion)
                )
            )
            .returning();

        if (!deleted) {
            return {
                success: false,
                error: ACTIVE_SESSION_VERSION_ERROR,
            };
        }

        revalidatePath('/timer');
        return {
            success: true,
            data: null,
        };
    }

    if (!update.data) {
        return {
            success: false,
            error: ACTIVE_SESSION_VERSION_ERROR,
        };
    }

    const [updated] = await db
        .update(activeSessions)
        .set(update.data)
        .where(
            and(
                eq(activeSessions.userId, user.id),
                eq(activeSessions.version, params.expectedVersion)
            )
        )
        .returning();

    if (!updated) {
        return {
            success: false,
            error: ACTIVE_SESSION_VERSION_ERROR,
        };
    }

    revalidatePath('/timer');
    return {
        success: true,
        data: await hydrateActiveSessionSnapshot(user.id, updated),
    };
}
