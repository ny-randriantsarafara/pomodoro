import { describe, expect, it } from 'vitest';
import {
    ACTIVE_SESSION_VERSION_ERROR,
    buildActiveSessionSnapshot,
    buildActiveSessionActionUpdate,
    buildVersionedUpdate,
    normalizePhaseAction,
} from '@/lib/active-session-utils';
import { DEFAULT_TIMER_SETTINGS } from '@/lib/settings';

describe('active session action helpers', () => {
    it('bumps the version on every state mutation', () => {
        expect(buildVersionedUpdate({ version: 4 }).version).toBe(5);
    });

    it('maps skip from focus into a break phase action', () => {
        expect(
            normalizePhaseAction({
                currentPhase: 'focus',
                action: 'skip',
            }).nextPhase
        ).toBe('shortBreak');
    });

    it('keeps pause on the same phase', () => {
        expect(
            normalizePhaseAction({
                currentPhase: 'longBreak',
                action: 'pause',
            }).nextPhase
        ).toBe('longBreak');
    });

    it('rejects stale version updates', () => {
        const result = buildActiveSessionActionUpdate({
            session: {
                phase: 'focus',
                phaseStartedAt: new Date('2026-03-10T10:00:00.000Z'),
                phaseDurationSeconds: 1500,
                completedFocusSessions: 0,
                isPaused: false,
                pausedAt: null,
                totalPausedSeconds: 0,
                version: 3,
            },
            action: 'pause',
            expectedVersion: 2,
            now: new Date('2026-03-10T10:05:00.000Z'),
            settings: DEFAULT_TIMER_SETTINGS,
        });

        expect(result).toEqual({
            success: false,
            error: ACTIVE_SESSION_VERSION_ERROR,
        });
    });

    it('marks the active session as paused', () => {
        const now = new Date('2026-03-10T10:05:00.000Z');
        const result = buildActiveSessionActionUpdate({
            session: {
                phase: 'focus',
                phaseStartedAt: new Date('2026-03-10T10:00:00.000Z'),
                phaseDurationSeconds: 1500,
                completedFocusSessions: 0,
                isPaused: false,
                pausedAt: null,
                totalPausedSeconds: 0,
                version: 3,
            },
            action: 'pause',
            expectedVersion: 3,
            now,
            settings: DEFAULT_TIMER_SETTINGS,
        });

        expect(result).toMatchObject({
            success: true,
            data: {
                isPaused: true,
                pausedAt: now,
                version: 4,
            },
        });
    });

    it('accumulates paused time when resuming', () => {
        const result = buildActiveSessionActionUpdate({
            session: {
                phase: 'focus',
                phaseStartedAt: new Date('2026-03-10T10:00:00.000Z'),
                phaseDurationSeconds: 1500,
                completedFocusSessions: 0,
                isPaused: true,
                pausedAt: new Date('2026-03-10T10:05:00.000Z'),
                totalPausedSeconds: 5,
                version: 7,
            },
            action: 'resume',
            expectedVersion: 7,
            now: new Date('2026-03-10T10:06:00.000Z'),
            settings: DEFAULT_TIMER_SETTINGS,
        });

        expect(result).toMatchObject({
            success: true,
            data: {
                isPaused: false,
                pausedAt: null,
                totalPausedSeconds: 65,
                version: 8,
            },
        });
    });

    it('skips focus into a short break using timer settings', () => {
        const result = buildActiveSessionActionUpdate({
            session: {
                phase: 'focus',
                phaseStartedAt: new Date('2026-03-10T10:00:00.000Z'),
                phaseDurationSeconds: 1500,
                completedFocusSessions: 0,
                isPaused: false,
                pausedAt: null,
                totalPausedSeconds: 0,
                version: 1,
            },
            action: 'skip',
            expectedVersion: 1,
            now: new Date('2026-03-10T10:05:00.000Z'),
            settings: DEFAULT_TIMER_SETTINGS,
        });

        expect(result).toMatchObject({
            success: true,
            data: {
                phase: 'shortBreak',
                phaseDurationSeconds: 300,
                completedFocusSessions: 1,
                version: 2,
            },
        });
    });

    it('marks stop actions for deletion', () => {
        const result = buildActiveSessionActionUpdate({
            session: {
                phase: 'shortBreak',
                phaseStartedAt: new Date('2026-03-10T10:05:00.000Z'),
                phaseDurationSeconds: 300,
                completedFocusSessions: 1,
                isPaused: false,
                pausedAt: null,
                totalPausedSeconds: 0,
                version: 4,
            },
            action: 'stop',
            expectedVersion: 4,
            now: new Date('2026-03-10T10:06:00.000Z'),
            settings: DEFAULT_TIMER_SETTINGS,
        });

        expect(result).toEqual({
            success: true,
            data: null,
            deleteActiveSession: true,
        });
    });

    it('adds task and session metadata for cross-device rendering', () => {
        expect(
            buildActiveSessionSnapshot(
                {
                    taskId: 'task-1',
                    phase: 'focus',
                    phaseStartedAt: new Date('2026-03-10T10:00:00.000Z'),
                    phaseDurationSeconds: 1500,
                    completedFocusSessions: 0,
                    isPaused: false,
                    pausedAt: null,
                    totalPausedSeconds: 0,
                    version: 2,
                },
                {
                    sessionId: 'session-1',
                    taskLabel: 'Write release notes',
                }
            )
        ).toMatchObject({
            taskId: 'task-1',
            sessionId: 'session-1',
            taskLabel: 'Write release notes',
            version: 2,
        });
    });
});
