'use server';

import { db } from '@/lib/db';
import { focusSessions, projects, sessionProjects } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-utils';
import { validateTask } from '@/lib/validators';
import { FOCUS_MODES } from '@/lib/constants';
import { eq, and, desc, gte, lt, isNull, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type {
    ActionResult,
    SessionWithProjects,
    DailyLogSummary,
} from '@/types';
import type { FocusSession, FocusMode } from '@/lib/db/schema';

export async function startSession(
    projectIds: ReadonlyArray<string>,
    task: string,
    focusMode: FocusMode
): Promise<ActionResult<FocusSession>> {
    const user = await requireAuth();

    const taskError = validateTask(task);
    if (taskError) {
        return { success: false, error: taskError };
    }

    if (!(focusMode in FOCUS_MODES)) {
        return { success: false, error: 'Invalid focus mode' };
    }

    const [activeSession] = await db
        .select()
        .from(focusSessions)
        .where(
            and(
                eq(focusSessions.userId, user.id),
                isNull(focusSessions.completedAt)
            )
        );

    if (activeSession) {
        return {
            success: false,
            error: 'You already have an active session. Complete or abandon it first.',
        };
    }

    const durationSeconds = FOCUS_MODES[focusMode].workMinutes * 60;

    const [session] = await db
        .insert(focusSessions)
        .values({
            userId: user.id,
            focusMode,
            task: task.trim(),
            startedAt: new Date(),
            durationSeconds,
            status: 'completed',
        })
        .returning();

    if (!session) {
        return { success: false, error: 'Failed to create session' };
    }

    if (projectIds.length > 0) {
        await db.insert(sessionProjects).values(
            projectIds.map((pid) => ({
                sessionId: session.id,
                projectId: pid,
            }))
        );
    }

    revalidatePath('/timer');
    revalidatePath('/log');
    return { success: true, data: session };
}

export async function completeSession(
    sessionId: string
): Promise<ActionResult<FocusSession>> {
    const user = await requireAuth();

    const [session] = await db
        .update(focusSessions)
        .set({
            completedAt: new Date(),
            status: 'completed',
        })
        .where(
            and(
                eq(focusSessions.id, sessionId),
                eq(focusSessions.userId, user.id)
            )
        )
        .returning();

    if (!session) {
        return { success: false, error: 'Session not found' };
    }

    revalidatePath('/timer');
    revalidatePath('/log');
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
            status: 'abandoned',
        })
        .where(
            and(
                eq(focusSessions.id, sessionId),
                eq(focusSessions.userId, user.id)
            )
        )
        .returning();

    if (!session) {
        return { success: false, error: 'Session not found' };
    }

    revalidatePath('/timer');
    revalidatePath('/log');
    return { success: true, data: session };
}

export async function getSessionsByDate(
    date: Date
): Promise<ReadonlyArray<SessionWithProjects>> {
    const user = await requireAuth();

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const sessionRows = await db
        .select({
            id: focusSessions.id,
            focusMode: focusSessions.focusMode,
            task: focusSessions.task,
            startedAt: focusSessions.startedAt,
            completedAt: focusSessions.completedAt,
            durationSeconds: focusSessions.durationSeconds,
            status: focusSessions.status,
        })
        .from(focusSessions)
        .where(
            and(
                eq(focusSessions.userId, user.id),
                gte(focusSessions.startedAt, startOfDay),
                lt(focusSessions.startedAt, endOfDay)
            )
        )
        .orderBy(desc(focusSessions.startedAt));

    const sessionIds = sessionRows.map((s) => s.id);

    if (sessionIds.length === 0) return [];

    const projectRows = await db
        .select({
            sessionId: sessionProjects.sessionId,
            projectId: projects.id,
            projectName: projects.name,
            projectColor: projects.color,
        })
        .from(sessionProjects)
        .innerJoin(projects, eq(sessionProjects.projectId, projects.id))
        .where(inArray(sessionProjects.sessionId, sessionIds));

    const projectsBySession = new Map<
        string,
        ReadonlyArray<{ readonly id: string; readonly name: string; readonly color: string }>
    >();
    for (const row of projectRows) {
        const existing = projectsBySession.get(row.sessionId) ?? [];
        projectsBySession.set(row.sessionId, [
            ...existing,
            {
                id: row.projectId,
                name: row.projectName,
                color: row.projectColor,
            },
        ]);
    }

    return sessionRows.map((s) => ({
        ...s,
        projects: projectsBySession.get(s.id) ?? [],
    }));
}

export async function getDailyLogSummary(date: Date): Promise<DailyLogSummary> {
    const sessions = await getSessionsByDate(date);

    const completedSessions = sessions.filter((s) => s.status === 'completed');

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
): Promise<ReadonlyArray<SessionWithProjects>> {
    const user = await requireAuth();

    const sessionRows = await db
        .select({
            id: focusSessions.id,
            focusMode: focusSessions.focusMode,
            task: focusSessions.task,
            startedAt: focusSessions.startedAt,
            completedAt: focusSessions.completedAt,
            durationSeconds: focusSessions.durationSeconds,
            status: focusSessions.status,
        })
        .from(focusSessions)
        .innerJoin(sessionProjects, eq(focusSessions.id, sessionProjects.sessionId))
        .where(
            and(
                eq(focusSessions.userId, user.id),
                eq(sessionProjects.projectId, projectId)
            )
        )
        .orderBy(desc(focusSessions.startedAt));

    const sessionIds = sessionRows.map((s) => s.id);

    if (sessionIds.length === 0) return [];

    const projectRows = await db
        .select({
            sessionId: sessionProjects.sessionId,
            projectId: projects.id,
            projectName: projects.name,
            projectColor: projects.color,
        })
        .from(sessionProjects)
        .innerJoin(projects, eq(sessionProjects.projectId, projects.id))
        .where(inArray(sessionProjects.sessionId, sessionIds));

    const projectsBySession = new Map<
        string,
        ReadonlyArray<{ readonly id: string; readonly name: string; readonly color: string }>
    >();
    for (const row of projectRows) {
        const existing = projectsBySession.get(row.sessionId) ?? [];
        projectsBySession.set(row.sessionId, [
            ...existing,
            {
                id: row.projectId,
                name: row.projectName,
                color: row.projectColor,
            },
        ]);
    }

    return sessionRows.map((s) => ({
        ...s,
        projects: projectsBySession.get(s.id) ?? [],
    }));
}
