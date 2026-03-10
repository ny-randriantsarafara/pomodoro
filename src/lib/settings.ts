import {
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

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakFrequency: 4,
    autoStartBreaks: false,
    autoStartFocusSessions: false,
};

function clampNumber(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function clampTimerSettings(
    input: Partial<TimerSettings>
): TimerSettings {
    return {
        workMinutes: clampNumber(
            input.workMinutes ?? DEFAULT_TIMER_SETTINGS.workMinutes,
            TIMER_WORK_MINUTES_MIN,
            TIMER_WORK_MINUTES_MAX
        ),
        shortBreakMinutes: clampNumber(
            input.shortBreakMinutes ?? DEFAULT_TIMER_SETTINGS.shortBreakMinutes,
            TIMER_SHORT_BREAK_MINUTES_MIN,
            TIMER_SHORT_BREAK_MINUTES_MAX
        ),
        longBreakMinutes: clampNumber(
            input.longBreakMinutes ?? DEFAULT_TIMER_SETTINGS.longBreakMinutes,
            TIMER_LONG_BREAK_MINUTES_MIN,
            TIMER_LONG_BREAK_MINUTES_MAX
        ),
        longBreakFrequency: clampNumber(
            input.longBreakFrequency ?? DEFAULT_TIMER_SETTINGS.longBreakFrequency,
            TIMER_LONG_BREAK_FREQUENCY_MIN,
            TIMER_LONG_BREAK_FREQUENCY_MAX
        ),
        autoStartBreaks:
            input.autoStartBreaks ?? DEFAULT_TIMER_SETTINGS.autoStartBreaks,
        autoStartFocusSessions:
            input.autoStartFocusSessions ??
            DEFAULT_TIMER_SETTINGS.autoStartFocusSessions,
    };
}
