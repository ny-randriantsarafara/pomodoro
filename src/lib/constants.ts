import type { FocusMode } from "@/lib/db/schema";
import type { TimerConfig } from "@/types";

export const FOCUS_MODES: Record<FocusMode, TimerConfig> = {
  short: { workMinutes: 25, breakMinutes: 5, label: "Short Focus" },
  average: { workMinutes: 50, breakMinutes: 10, label: "Average Focus" },
  deep: { workMinutes: 90, breakMinutes: 20, label: "Deep Focus" },
};

export const TASK_MAX_LENGTH = 500;
export const TASK_MIN_LENGTH = 1;
export const PROJECT_NAME_MAX_LENGTH = 100;
export const PROJECT_NAME_MIN_LENGTH = 1;
export const GITHUB_LABEL_MAX_LENGTH = 50;
export const GITHUB_LABEL_MIN_LENGTH = 1;

export const TIMER_STORAGE_KEY = "pomodoro-active-timer";
