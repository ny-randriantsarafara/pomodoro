'use server';

import { DEFAULT_TIMER_SETTINGS } from '@/lib/settings';
import { transitionToNextPhase } from '@/lib/active-session-machine';
import type { ActionResult, TimerSettings } from '@/types';
import type { ActiveSessionPhase } from '@/lib/db/schema';

export type ActiveSessionAction = 'pause' | 'resume' | 'skip' | 'stop';
type ActiveSessionRecord = {
    readonly userId?: string;
    readonly taskId?: string | null;
    readonly phase: ActiveSessionPhase;
    readonly phaseStartedAt: Date;
    readonly phaseDurationSeconds: number;
    readonly completedFocusSessions: number;
    readonly isPaused: boolean;
    readonly pausedAt: Date | null;
    readonly totalPausedSeconds: number;
    readonly version: number;
};

type ActiveSessionMutation = {
    readonly phase?: ActiveSessionPhase;
    readonly phaseStartedAt?: Date;
    readonly phaseDurationSeconds?: number;
    readonly completedFocusSessions?: number;
    readonly isPaused?: boolean;
    readonly pausedAt?: Date | null;
    readonly totalPausedSeconds?: number;
    readonly version: number;
    readonly updatedAt: Date;
};

interface VersionedRecord {
    readonly version: number;
}

interface NormalizePhaseActionInput {
    readonly currentPhase: ActiveSessionPhase;
    readonly action: ActiveSessionAction;
}

interface NormalizePhaseActionResult {
    readonly nextPhase: ActiveSessionPhase;
}

interface BuildActiveSessionActionUpdateInput {
    readonly session: ActiveSessionRecord;
    readonly action: ActiveSessionAction;
    readonly expectedVersion: number;
    readonly now: Date;
    readonly settings: TimerSettings;
}

type BuildActiveSessionActionUpdateResult =
    | { readonly success: false; readonly error: string }
    | {
          readonly success: true;
          readonly data: ActiveSessionMutation | null;
          readonly deleteActiveSession?: boolean;
      };

export const ACTIVE_SESSION_VERSION_ERROR =
    'Active session is out of date. Refresh and try again.';
export const ACTIVE_SESSION_NOT_FOUND_ERROR = 'Active session not found.';
export const ACTIVE_SESSION_ALREADY_EXISTS_ERROR =
    'You already have an active session.';

export function buildVersionedUpdate<T extends VersionedRecord>(record: T) {
    return {
        version: record.version + 1,
        updatedAt: new Date(),
    };
}

export function normalizePhaseAction(
    input: NormalizePhaseActionInput
): NormalizePhaseActionResult {
    if (input.action === 'skip') {
        if (input.currentPhase === 'focus') {
            return { nextPhase: 'shortBreak' };
        }

        return { nextPhase: 'focus' };
    }

    return {
        nextPhase: input.currentPhase,
    };
}

function getPhaseDurationSeconds(
    phase: ActiveSessionPhase,
    settings: TimerSettings
): number {
    switch (phase) {
        case 'focus':
            return settings.workMinutes * 60;
        case 'shortBreak':
            return settings.shortBreakMinutes * 60;
        case 'longBreak':
            return settings.longBreakMinutes * 60;
    }
}

function getResumePausedSeconds(session: ActiveSessionRecord, now: Date): number {
    if (!session.pausedAt) {
        return session.totalPausedSeconds;
    }

    const pausedSeconds = Math.max(
        0,
        Math.round((now.getTime() - session.pausedAt.getTime()) / 1000)
    );

    return session.totalPausedSeconds + pausedSeconds;
}

export function buildActiveSessionActionUpdate(
    input: BuildActiveSessionActionUpdateInput
): BuildActiveSessionActionUpdateResult {
    if (input.expectedVersion !== input.session.version) {
        return {
            success: false,
            error: ACTIVE_SESSION_VERSION_ERROR,
        };
    }

    if (input.action === 'stop') {
        return {
            success: true,
            data: null,
            deleteActiveSession: true,
        };
    }

    if (input.action === 'pause') {
        return {
            success: true,
            data: {
                ...buildVersionedUpdate(input.session),
                isPaused: true,
                pausedAt: input.now,
            },
        };
    }

    if (input.action === 'resume') {
        return {
            success: true,
            data: {
                ...buildVersionedUpdate(input.session),
                isPaused: false,
                pausedAt: null,
                totalPausedSeconds: getResumePausedSeconds(
                    input.session,
                    input.now
                ),
            },
        };
    }

    const transition = transitionToNextPhase({
        currentPhase: input.session.phase,
        completedFocusCount: input.session.completedFocusSessions,
        longBreakFrequency: input.settings.longBreakFrequency,
        shortBreakSeconds: getPhaseDurationSeconds('shortBreak', input.settings),
        longBreakSeconds: getPhaseDurationSeconds('longBreak', input.settings),
        nextFocusSeconds: getPhaseDurationSeconds('focus', input.settings),
    });

    return {
        success: true,
        data: {
            ...buildVersionedUpdate(input.session),
            phase: transition.nextPhase,
            phaseStartedAt: input.now,
            phaseDurationSeconds: transition.nextDurationSeconds,
            completedFocusSessions: transition.completedFocusCount,
            isPaused: false,
            pausedAt: null,
            totalPausedSeconds: 0,
        },
    };
}

async function loadDependencies() {
    const [{ requireAuth }, { db }, schema, { and, eq }, { revalidatePath }] =
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
        userSettings: schema.userSettings,
        and,
        eq,
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

export async function getActiveSession(): Promise<ActionResult<ActiveSessionRecord | null>> {
    const { requireAuth, db, activeSessions, eq } = await loadDependencies();
    const user = await requireAuth();
    const [session] = await db
        .select()
        .from(activeSessions)
        .where(eq(activeSessions.userId, user.id));

    return {
        success: true,
        data: session ?? null,
    };
}

export async function createActiveSession(params: {
    readonly taskId?: string | null;
    readonly phase?: ActiveSessionPhase;
    readonly phaseStartedAt?: Date;
    readonly phaseDurationSeconds?: number;
    readonly completedFocusSessions?: number;
}): Promise<ActionResult<ActiveSessionRecord>> {
    const { requireAuth, db, activeSessions, eq, revalidatePath } =
        await loadDependencies();
    const user = await requireAuth();

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
        data: session,
    };
}

export async function applyActiveSessionAction(params: {
    readonly action: ActiveSessionAction;
    readonly expectedVersion: number;
    readonly now?: Date;
}): Promise<ActionResult<ActiveSessionRecord | null>> {
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
        data: updated,
    };
}
