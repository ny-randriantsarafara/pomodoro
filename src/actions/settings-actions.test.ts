import { describe, expect, it } from 'vitest';
import { mergeSettingsPatch } from './settings-actions';

describe('mergeSettingsPatch', () => {
    it('preserves existing values when only one field changes', async () => {
        await expect(
            mergeSettingsPatch(
                {
                    workMinutes: 25,
                    shortBreakMinutes: 5,
                    longBreakMinutes: 15,
                    longBreakFrequency: 4,
                    autoStartBreaks: false,
                    autoStartFocusSessions: false,
                    dailyGoalMinutes: 100,
                    analyticsOptIn: false,
                },
                { workMinutes: 50 }
            )
        ).resolves.toMatchObject({
            workMinutes: 50,
            shortBreakMinutes: 5,
            dailyGoalMinutes: 100,
            analyticsOptIn: false,
        });
    });

    it('applies explicit false boolean patches instead of keeping the previous value', async () => {
        await expect(
            mergeSettingsPatch(
                {
                    workMinutes: 25,
                    shortBreakMinutes: 5,
                    longBreakMinutes: 15,
                    longBreakFrequency: 4,
                    autoStartBreaks: true,
                    autoStartFocusSessions: true,
                    dailyGoalMinutes: 100,
                    analyticsOptIn: true,
                },
                { autoStartBreaks: false, analyticsOptIn: false }
            )
        ).resolves.toMatchObject({
            autoStartBreaks: false,
            analyticsOptIn: false,
        });
    });
});
