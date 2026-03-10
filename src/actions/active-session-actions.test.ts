import { describe, expect, it } from 'vitest';
import {
    buildVersionedUpdate,
    normalizePhaseAction,
} from './active-session-actions';

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
});
