import type { FocusMode, SessionStatus } from "@/lib/db/schema";

export interface StartTimerParams {
  readonly sessionId: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly projectColor: string;
  readonly task: string;
  readonly focusMode: FocusMode;
  readonly durationSeconds: number;
}

export interface TimerConfig {
  readonly workMinutes: number;
  readonly breakMinutes: number;
  readonly label: string;
}

export interface ActiveTimer {
  readonly sessionId: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly projectColor: string;
  readonly task: string;
  readonly focusMode: FocusMode;
  readonly startedAt: number;
  readonly durationSeconds: number;
  readonly isPaused: boolean;
  readonly pausedAt: number | null;
  readonly totalPausedSeconds: number;
}

export interface DailyLogSummary {
  readonly totalFocusSeconds: number;
  readonly sessionCount: number;
  readonly byMode: Record<FocusMode, number>;
}

export interface SessionWithProject {
  readonly id: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly projectColor: string;
  readonly focusMode: FocusMode;
  readonly task: string;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly durationSeconds: number;
  readonly status: SessionStatus;
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
