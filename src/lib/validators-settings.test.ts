import { describe, expect, it } from 'vitest';
import { validateTimerSettings } from './validators';

describe('timer settings validation', () => {
    it('accepts valid timer settings', () => {
        expect(
            validateTimerSettings({
                workMinutes: 25,
                shortBreakMinutes: 5,
                longBreakMinutes: 15,
                longBreakFrequency: 4,
                autoStartBreaks: false,
                autoStartFocusSessions: false,
            })
        ).toBeNull();
    });

    it('rejects invalid work duration', () => {
        expect(
            validateTimerSettings({
                workMinutes: 0,
                shortBreakMinutes: 5,
                longBreakMinutes: 15,
                longBreakFrequency: 4,
                autoStartBreaks: false,
                autoStartFocusSessions: false,
            })
        ).toBe('Work duration must be between 1 and 180 minutes');
    });

    it('rejects invalid long break frequency', () => {
        expect(
            validateTimerSettings({
                workMinutes: 25,
                shortBreakMinutes: 5,
                longBreakMinutes: 15,
                longBreakFrequency: 0,
                autoStartBreaks: false,
                autoStartFocusSessions: false,
            })
        ).toBe('Long break frequency must be between 1 and 12 sessions');
    });
});
