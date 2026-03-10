import { describe, expect, it } from 'vitest';
import {
    DEFAULT_APP_SETTINGS,
    DEFAULT_TIMER_SETTINGS,
    clampAppSettings,
    clampTimerSettings,
} from './settings';

describe('timer settings', () => {
    it('returns the approved pomodoro defaults', () => {
        expect(DEFAULT_TIMER_SETTINGS).toMatchObject({
            workMinutes: 25,
            shortBreakMinutes: 5,
            longBreakMinutes: 15,
            longBreakFrequency: 4,
            autoStartBreaks: false,
            autoStartFocusSessions: false,
        });
    });

    it('clamps invalid timer values into safe ranges', () => {
        expect(
            clampTimerSettings({
                workMinutes: 0,
                shortBreakMinutes: 500,
                longBreakMinutes: -1,
                longBreakFrequency: 99,
            })
        ).toMatchObject({
            workMinutes: 1,
            shortBreakMinutes: 60,
            longBreakMinutes: 1,
            longBreakFrequency: 12,
            autoStartBreaks: false,
            autoStartFocusSessions: false,
        });
    });

    it('provides app-level defaults for goals and privacy settings', () => {
        expect(DEFAULT_APP_SETTINGS).toMatchObject({
            dailyGoalMinutes: 100,
            analyticsOptIn: false,
        });
    });

    it('clamps app settings without dropping timer defaults', () => {
        expect(
            clampAppSettings({
                workMinutes: 500,
                dailyGoalMinutes: -20,
                analyticsOptIn: true,
            })
        ).toMatchObject({
            workMinutes: 180,
            shortBreakMinutes: 5,
            dailyGoalMinutes: 0,
            analyticsOptIn: true,
        });
    });
});
