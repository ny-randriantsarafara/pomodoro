'use server';

import { db } from '@/lib/db';
import { focusSessions, projects } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-utils';
import { eq, desc } from 'drizzle-orm';
import type { StatsData, DailyFocusPoint, ProjectStats } from '@/types';
import type { FocusMode } from '@/lib/db/schema';

const DAY_NAMES = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
] as const;

function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function startOfWeek(date: Date): Date {
    const d = startOfDay(date);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    return d;
}

export async function getStats(): Promise<StatsData> {
    const user = await requireAuth();

    const allSessions = await db
        .select({
            id: focusSessions.id,
            projectId: focusSessions.projectId,
            projectName: projects.name,
            projectColor: projects.color,
            focusMode: focusSessions.focusMode,
            startedAt: focusSessions.startedAt,
            completedAt: focusSessions.completedAt,
            durationSeconds: focusSessions.durationSeconds,
            status: focusSessions.status,
        })
        .from(focusSessions)
        .innerJoin(projects, eq(focusSessions.projectId, projects.id))
        .where(eq(focusSessions.userId, user.id))
        .orderBy(desc(focusSessions.startedAt));

    const completed = allSessions.filter((s) => s.status === 'completed');
    const abandoned = allSessions.filter((s) => s.status === 'abandoned');

    const totalFocusSeconds = completed.reduce(
        (sum, s) => sum + s.durationSeconds,
        0
    );
    const completionRate =
        allSessions.length > 0 ? completed.length / allSessions.length : 0;

    // By mode
    const byMode: Record<FocusMode, { count: number; seconds: number }> = {
        short: { count: 0, seconds: 0 },
        average: { count: 0, seconds: 0 },
        deep: { count: 0, seconds: 0 },
    };
    for (const s of completed) {
        byMode[s.focusMode].count += 1;
        byMode[s.focusMode].seconds += s.durationSeconds;
    }

    const preferredMode = (
        Object.entries(byMode) as ReadonlyArray<
            [FocusMode, { count: number; seconds: number }]
        >
    ).reduce(
        (best, [mode, data]) =>
            data.count > best.count ? { mode, count: data.count } : best,
        { mode: 'short' as FocusMode, count: 0 }
    ).mode;

    // Daily focus for last 30 days + streak calculation
    const daysWithSessions = new Map<
        string,
        { totalMinutes: number; sessionCount: number }
    >();

    for (const s of completed) {
        const key = formatDateKey(s.startedAt);
        const existing = daysWithSessions.get(key) ?? {
            totalMinutes: 0,
            sessionCount: 0,
        };
        existing.totalMinutes += Math.round(s.durationSeconds / 60);
        existing.sessionCount += 1;
        daysWithSessions.set(key, existing);
    }

    // Current streak and best streak
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    const today = startOfDay(new Date());
    const checkDate = new Date(today);

    // Check if today has sessions; if not, start from yesterday
    if (!daysWithSessions.has(formatDateKey(checkDate))) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    // Walk backwards counting consecutive days
    for (let i = 0; i < 365; i++) {
        const key = formatDateKey(checkDate);
        if (daysWithSessions.has(key)) {
            tempStreak += 1;
        } else {
            break;
        }
        checkDate.setDate(checkDate.getDate() - 1);
    }
    currentStreak = tempStreak;

    // Best streak: walk through all days with sessions sorted
    const sortedDays = Array.from(daysWithSessions.keys()).sort();
    tempStreak = 1;
    bestStreak = sortedDays.length > 0 ? 1 : 0;
    for (let i = 1; i < sortedDays.length; i++) {
        const prev = new Date(sortedDays[i - 1]);
        const curr = new Date(sortedDays[i]);
        const diffMs = curr.getTime() - prev.getTime();
        if (diffMs <= 86400000 + 1000) {
            tempStreak += 1;
            if (tempStreak > bestStreak) bestStreak = tempStreak;
        } else {
            tempStreak = 1;
        }
    }

    // Daily focus points for the last 30 days
    const dailyFocus: DailyFocusPoint[] = [];
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    for (let i = 0; i < 30; i++) {
        const d = new Date(thirtyDaysAgo);
        d.setDate(d.getDate() + i);
        const key = formatDateKey(d);
        const data = daysWithSessions.get(key);
        dailyFocus.push({
            date: key,
            totalMinutes: data?.totalMinutes ?? 0,
            sessionCount: data?.sessionCount ?? 0,
        });
    }

    // This week
    const weekStart = startOfWeek(new Date());
    let thisWeekSeconds = 0;
    let thisWeekSessions = 0;
    for (const s of completed) {
        if (s.startedAt >= weekStart) {
            thisWeekSeconds += s.durationSeconds;
            thisWeekSessions += 1;
        }
    }

    // Most productive day of the week
    const dayTotals = new Array(7).fill(0) as number[];
    for (const s of completed) {
        dayTotals[s.startedAt.getDay()] += s.durationSeconds;
    }
    const maxDayIdx = dayTotals.indexOf(Math.max(...dayTotals));
    const mostProductiveDay =
        dayTotals[maxDayIdx] > 0 ? DAY_NAMES[maxDayIdx] : null;

    // Peak hour
    const hourCounts = new Array(24).fill(0) as number[];
    for (const s of completed) {
        hourCounts[s.startedAt.getHours()] += 1;
    }
    const maxHourIdx = hourCounts.indexOf(Math.max(...hourCounts));
    const peakHour = hourCounts[maxHourIdx] > 0 ? maxHourIdx : null;

    // Project stats
    const projectMap = new Map<
        string,
        {
            name: string;
            color: string;
            totalSeconds: number;
            count: number;
            lastDate: Date | null;
        }
    >();
    for (const s of completed) {
        const existing = projectMap.get(s.projectId) ?? {
            name: s.projectName,
            color: s.projectColor,
            totalSeconds: 0,
            count: 0,
            lastDate: null,
        };
        existing.totalSeconds += s.durationSeconds;
        existing.count += 1;
        if (!existing.lastDate || s.startedAt > existing.lastDate) {
            existing.lastDate = s.startedAt;
        }
        projectMap.set(s.projectId, existing);
    }

    const projectStats: ProjectStats[] = Array.from(projectMap.entries())
        .map(([projectId, data]) => ({
            projectId,
            projectName: data.name,
            projectColor: data.color,
            totalSeconds: data.totalSeconds,
            sessionCount: data.count,
            lastSessionDate: data.lastDate,
        }))
        .sort((a, b) => b.totalSeconds - a.totalSeconds);

    // Average daily minutes (over days that had sessions)
    const activeDays = daysWithSessions.size;
    const averageDailyMinutes =
        activeDays > 0 ? Math.round(totalFocusSeconds / 60 / activeDays) : 0;

    return {
        totalFocusSeconds,
        totalSessions: allSessions.length,
        completedSessions: completed.length,
        abandonedSessions: abandoned.length,
        completionRate,
        currentStreak,
        bestStreak,
        thisWeekSeconds,
        thisWeekSessions,
        byMode,
        preferredMode,
        mostProductiveDay,
        peakHour,
        dailyFocus,
        projectStats,
        averageDailyMinutes,
    };
}
