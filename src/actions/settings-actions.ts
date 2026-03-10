'use server';

import { clampAppSettings, DEFAULT_APP_SETTINGS } from '@/lib/settings';
import type { ActionResult, AppSettings, TimerSettings } from '@/types';
import type { UserSettings } from '@/lib/db/schema';

type SettingsPatch = Partial<AppSettings>;

function toAppSettings(settings: UserSettings | null | undefined): AppSettings {
    if (!settings) {
        return DEFAULT_APP_SETTINGS;
    }

    return clampAppSettings({
        workMinutes: settings.workMinutes,
        shortBreakMinutes: settings.shortBreakMinutes,
        longBreakMinutes: settings.longBreakMinutes,
        longBreakFrequency: settings.longBreakFrequency,
        autoStartBreaks: settings.autoStartBreaks,
        autoStartFocusSessions: settings.autoStartFocusSessions,
        dailyGoalMinutes: settings.dailyGoalMinutes,
        analyticsOptIn: settings.analyticsOptIn,
    });
}

export async function mergeSettingsPatch<T extends object>(
    current: T,
    patch: Partial<T>
): Promise<T> {
    return {
        ...current,
        ...patch,
    };
}

async function loadDependencies() {
    const [{ requireAuth }, { db }, schema, { eq }, { revalidatePath }] =
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
        userSettings: schema.userSettings,
        eq,
        revalidatePath,
    };
}

async function getStoredSettings(userId: string): Promise<UserSettings | null> {
    const { db, userSettings, eq } = await loadDependencies();
    const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

    return settings ?? null;
}

export async function getSettings(): Promise<AppSettings> {
    const { requireAuth } = await loadDependencies();
    const user = await requireAuth();
    const settings = await getStoredSettings(user.id);

    return toAppSettings(settings);
}

async function persistSettingsPatch(
    patch: SettingsPatch
): Promise<ActionResult<AppSettings>> {
    const { requireAuth, db, userSettings, eq, revalidatePath } =
        await loadDependencies();
    const user = await requireAuth();
    const existing = await getStoredSettings(user.id);
    const next = clampAppSettings(
        await mergeSettingsPatch(toAppSettings(existing), patch)
    );

    const values = {
        userId: user.id,
        workMinutes: next.workMinutes,
        shortBreakMinutes: next.shortBreakMinutes,
        longBreakMinutes: next.longBreakMinutes,
        longBreakFrequency: next.longBreakFrequency,
        autoStartBreaks: next.autoStartBreaks,
        autoStartFocusSessions: next.autoStartFocusSessions,
        dailyGoalMinutes: next.dailyGoalMinutes,
        analyticsOptIn: next.analyticsOptIn,
    };

    let row: UserSettings | undefined;
    if (existing) {
        [row] = await db
            .update(userSettings)
            .set({
                ...values,
                updatedAt: new Date(),
            })
            .where(eq(userSettings.userId, user.id))
            .returning();
    } else {
        [row] = await db.insert(userSettings).values(values).returning();
    }

    if (!row) {
        return {
            success: false,
            error: 'Failed to save settings.',
        };
    }

    revalidatePath('/settings');
    revalidatePath('/timer');

    return {
        success: true,
        data: toAppSettings(row),
    };
}

export async function updateTimerSettings(
    patch: Partial<TimerSettings>
): Promise<ActionResult<AppSettings>> {
    return persistSettingsPatch(patch);
}

export async function updateDailyGoalMinutes(
    dailyGoalMinutes: number
): Promise<ActionResult<AppSettings>> {
    return persistSettingsPatch({ dailyGoalMinutes });
}

export async function updatePrivacySettings(patch: {
    readonly analyticsOptIn: boolean;
}): Promise<ActionResult<AppSettings>> {
    return persistSettingsPatch(patch);
}
