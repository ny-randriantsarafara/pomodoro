import type {
    ActiveSessionPhase,
    FocusMode,
    SessionStatus,
} from '@/lib/db/schema';

export interface SessionProjectRef {
    readonly id: string;
    readonly name: string;
    readonly color: string;
}

export interface StartTimerParams {
    readonly sessionId: string;
    readonly taskId?: string;
    readonly projects: ReadonlyArray<SessionProjectRef>;
    readonly task: string;
    readonly description?: string;
    readonly focusMode: FocusMode;
    readonly durationSeconds: number;
}

export interface TimerConfig {
    readonly workMinutes: number;
    readonly breakMinutes: number;
    readonly label: string;
}

export interface TimerSettings {
    readonly workMinutes: number;
    readonly shortBreakMinutes: number;
    readonly longBreakMinutes: number;
    readonly longBreakFrequency: number;
    readonly autoStartBreaks: boolean;
    readonly autoStartFocusSessions: boolean;
}

export interface AppSettings extends TimerSettings {
    readonly dailyGoalMinutes: number;
    readonly analyticsOptIn: boolean;
}

export interface ActiveTimer {
    readonly sessionId: string;
    readonly taskId?: string;
    readonly projects: ReadonlyArray<SessionProjectRef>;
    readonly task: string;
    readonly description?: string;
    readonly focusMode: FocusMode;
    readonly startedAt: number;
    readonly durationSeconds: number;
    readonly isPaused: boolean;
    readonly pausedAt: number | null;
    readonly totalPausedSeconds: number;
}

export interface ActiveSessionSnapshot {
    readonly taskId: string | null;
    readonly sessionId: string | null;
    readonly taskLabel: string | null;
    readonly focusMode: FocusMode | null;
    readonly projects: ReadonlyArray<SessionProjectRef>;
    readonly phase: ActiveSessionPhase;
    readonly phaseStartedAt: Date;
    readonly phaseDurationSeconds: number;
    readonly completedFocusSessions: number;
    readonly isPaused: boolean;
    readonly pausedAt: Date | null;
    readonly totalPausedSeconds: number;
    readonly version: number;
}

export interface DailyLogSummary {
    readonly totalFocusSeconds: number;
    readonly sessionCount: number;
    readonly byMode: Record<FocusMode, number>;
}

export interface SessionWithProjects {
    readonly id: string;
    readonly taskId: string | null;
    readonly projects: ReadonlyArray<SessionProjectRef>;
    readonly focusMode: FocusMode;
    readonly task: string;
    readonly startedAt: Date;
    readonly completedAt: Date | null;
    readonly durationSeconds: number;
    readonly status: SessionStatus;
    readonly description: string | null;
}

export interface GitHubRepo {
    readonly id: number;
    readonly name: string;
    readonly fullName: string;
    readonly htmlUrl: string;
    readonly owner: string;
    readonly description: string | null;
}

export type ActionResult<T = void> =
    | { readonly success: true; readonly data: T }
    | { readonly success: false; readonly error: string };

export interface DailyFocusPoint {
    readonly date: string;
    readonly totalMinutes: number;
    readonly sessionCount: number;
}

export interface ProjectStats {
    readonly projectId: string;
    readonly projectName: string;
    readonly projectColor: string;
    readonly totalSeconds: number;
    readonly sessionCount: number;
    readonly lastSessionDate: Date | null;
}

export interface TaskStats {
    readonly taskId: string;
    readonly taskLabel: string;
    readonly totalSeconds: number;
    readonly sessionCount: number;
}

export interface StatsData {
    readonly totalFocusSeconds: number;
    readonly totalSessions: number;
    readonly completedSessions: number;
    readonly abandonedSessions: number;
    readonly completionRate: number;
    readonly currentStreak: number;
    readonly bestStreak: number;
    readonly thisWeekSeconds: number;
    readonly thisWeekSessions: number;
    readonly byMode: Record<
        FocusMode,
        { readonly count: number; readonly seconds: number }
    >;
    readonly preferredMode: FocusMode;
    readonly mostProductiveDay: string | null;
    readonly peakHour: number | null;
    readonly dailyFocus: ReadonlyArray<DailyFocusPoint>;
    readonly projectStats: ReadonlyArray<ProjectStats>;
    readonly taskStats: ReadonlyArray<TaskStats>;
    readonly averageDailyMinutes: number;
}
