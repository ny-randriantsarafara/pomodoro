import type {
    StatsData,
    DailyFocusPoint,
    ProjectStats,
    TaskStats,
} from '@/types';
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

interface TaskLeaderboardInput {
    readonly taskId: string | null;
    readonly task: string;
    readonly durationSeconds: number;
}

export function buildTaskLeaderboard(
    sessions: ReadonlyArray<TaskLeaderboardInput>
): ReadonlyArray<TaskStats> {
    const map = new Map<
        string,
        { taskId: string; taskLabel: string; totalSeconds: number; sessionCount: number }
    >();

    for (const session of sessions) {
        if (!session.taskId) {
            continue;
        }

        const existing = map.get(session.taskId) ?? {
            taskId: session.taskId,
            taskLabel: session.task,
            totalSeconds: 0,
            sessionCount: 0,
        };

        existing.totalSeconds += session.durationSeconds;
        existing.sessionCount += 1;
        map.set(session.taskId, existing);
    }

    return Array.from(map.values()).sort(
        (left, right) => right.totalSeconds - left.totalSeconds
    );
}

async function loadDependencies() {
    const [{ db }, schema, { requireAuth }, { desc, eq, inArray }] =
        await Promise.all([
            import('@/lib/db'),
            import('@/lib/db/schema'),
            import('@/lib/auth-utils'),
            import('drizzle-orm'),
        ]);

    return {
        db,
        focusSessions: schema.focusSessions,
        projects: schema.projects,
        sessionProjects: schema.sessionProjects,
        requireAuth,
        desc,
        eq,
        inArray,
    };
}

export async function getStats(): Promise<StatsData> {
    const {
        db,
        focusSessions,
        projects,
        sessionProjects,
        requireAuth,
        desc,
        eq,
        inArray,
    } = await loadDependencies();
    const user = await requireAuth();

    const allSessions = await db
        .select({
            id: focusSessions.id,
            taskId: focusSessions.taskId,
            task: focusSessions.task,
            focusMode: focusSessions.focusMode,
            startedAt: focusSessions.startedAt,
            completedAt: focusSessions.completedAt,
            durationSeconds: focusSessions.durationSeconds,
            status: focusSessions.status,
        })
        .from(focusSessions)
        .where(eq(focusSessions.userId, user.id))
        .orderBy(desc(focusSessions.startedAt));

    const completed = allSessions.filter((s) => s.status === 'completed');
    const completedIds = completed.map((s) => s.id);

    const projectRows =
        completedIds.length > 0
            ? await db
                  .select({
                      sessionId: sessionProjects.sessionId,
                      projectId: projects.id,
                      projectName: projects.name,
                      projectColor: projects.color,
                  })
                  .from(sessionProjects)
                  .innerJoin(projects, eq(sessionProjects.projectId, projects.id))
                  .where(inArray(sessionProjects.sessionId, completedIds))
            : [];
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

    // Project stats (100% time credit per tagged project)
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
    for (const row of projectRows) {
        const session = completed.find((s) => s.id === row.sessionId);
        if (!session) continue;
        const existing = projectMap.get(row.projectId) ?? {
            name: row.projectName,
            color: row.projectColor,
            totalSeconds: 0,
            count: 0,
            lastDate: null,
        };
        existing.totalSeconds += session.durationSeconds;
        existing.count += 1;
        if (!existing.lastDate || session.startedAt > existing.lastDate) {
            existing.lastDate = session.startedAt;
        }
        projectMap.set(row.projectId, existing);
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

    const taskStats = buildTaskLeaderboard(completed);

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
        taskStats,
        averageDailyMinutes,
    };
}
