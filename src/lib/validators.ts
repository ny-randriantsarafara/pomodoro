import {
    TASK_MAX_LENGTH,
    TASK_MIN_LENGTH,
    PROJECT_NAME_MAX_LENGTH,
    PROJECT_NAME_MIN_LENGTH,
    GITHUB_LABEL_MAX_LENGTH,
    GITHUB_LABEL_MIN_LENGTH,
    TIMER_LONG_BREAK_FREQUENCY_MAX,
    TIMER_LONG_BREAK_FREQUENCY_MIN,
    TIMER_LONG_BREAK_MINUTES_MAX,
    TIMER_LONG_BREAK_MINUTES_MIN,
    TIMER_SHORT_BREAK_MINUTES_MAX,
    TIMER_SHORT_BREAK_MINUTES_MIN,
    TIMER_WORK_MINUTES_MAX,
    TIMER_WORK_MINUTES_MIN,
} from './constants';
import type { TimerSettings } from '@/types';

export function validateProjectName(name: string): string | null {
    const trimmed = name.trim();
    if (trimmed.length < PROJECT_NAME_MIN_LENGTH) {
        return 'Project name is required';
    }
    if (trimmed.length > PROJECT_NAME_MAX_LENGTH) {
        return `Project name must be at most ${PROJECT_NAME_MAX_LENGTH} characters`;
    }
    return null;
}

export function validateTask(task: string): string | null {
    const trimmed = task.trim();
    if (trimmed.length < TASK_MIN_LENGTH) {
        return 'Task description is required';
    }
    if (trimmed.length > TASK_MAX_LENGTH) {
        return `Task must be at most ${TASK_MAX_LENGTH} characters`;
    }
    return null;
}

export function validateTaskTitle(title: string): string | null {
    const trimmed = title.trim();
    if (trimmed.length < TASK_MIN_LENGTH) {
        return 'Task title is required';
    }
    if (trimmed.length > TASK_MAX_LENGTH) {
        return `Task title must be at most ${TASK_MAX_LENGTH} characters`;
    }
    return null;
}

export function validateGithubLabel(label: string): string | null {
    const trimmed = label.trim();
    if (trimmed.length < GITHUB_LABEL_MIN_LENGTH) {
        return 'Label is required';
    }
    if (trimmed.length > GITHUB_LABEL_MAX_LENGTH) {
        return `Label must be at most ${GITHUB_LABEL_MAX_LENGTH} characters`;
    }
    return null;
}

export function validateColor(color: string): string | null {
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return 'Color must be a valid hex color (e.g. #A0A0FF)';
    }
    return null;
}

export function validateTimerSettings(
    settings: TimerSettings
): string | null {
    if (
        settings.workMinutes < TIMER_WORK_MINUTES_MIN ||
        settings.workMinutes > TIMER_WORK_MINUTES_MAX
    ) {
        return `Work duration must be between ${TIMER_WORK_MINUTES_MIN} and ${TIMER_WORK_MINUTES_MAX} minutes`;
    }

    if (
        settings.shortBreakMinutes < TIMER_SHORT_BREAK_MINUTES_MIN ||
        settings.shortBreakMinutes > TIMER_SHORT_BREAK_MINUTES_MAX
    ) {
        return `Short break duration must be between ${TIMER_SHORT_BREAK_MINUTES_MIN} and ${TIMER_SHORT_BREAK_MINUTES_MAX} minutes`;
    }

    if (
        settings.longBreakMinutes < TIMER_LONG_BREAK_MINUTES_MIN ||
        settings.longBreakMinutes > TIMER_LONG_BREAK_MINUTES_MAX
    ) {
        return `Long break duration must be between ${TIMER_LONG_BREAK_MINUTES_MIN} and ${TIMER_LONG_BREAK_MINUTES_MAX} minutes`;
    }

    if (
        settings.longBreakFrequency < TIMER_LONG_BREAK_FREQUENCY_MIN ||
        settings.longBreakFrequency > TIMER_LONG_BREAK_FREQUENCY_MAX
    ) {
        return `Long break frequency must be between ${TIMER_LONG_BREAK_FREQUENCY_MIN} and ${TIMER_LONG_BREAK_FREQUENCY_MAX} sessions`;
    }

    return null;
}
