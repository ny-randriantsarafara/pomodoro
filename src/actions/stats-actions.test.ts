import { describe, expect, it } from 'vitest';
import { buildTaskLeaderboard } from './stats-actions';

describe('task leaderboard', () => {
    it('aggregates session time by task id', () => {
        expect(
            buildTaskLeaderboard([
                {
                    taskId: 't1',
                    task: 'Write release notes',
                    durationSeconds: 1500,
                },
                {
                    taskId: 't1',
                    task: 'Write release notes',
                    durationSeconds: 1500,
                },
                {
                    taskId: null,
                    task: 'Quick idea',
                    durationSeconds: 600,
                },
            ])
        ).toEqual([
            {
                taskId: 't1',
                taskLabel: 'Write release notes',
                totalSeconds: 3000,
                sessionCount: 2,
            },
        ]);
    });
});
