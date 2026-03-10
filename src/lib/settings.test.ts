import { describe, expect, it } from 'vitest';
import {
    DEFAULT_TIMER_SETTINGS,
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
});
