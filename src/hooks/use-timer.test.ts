import { describe, expect, it } from 'vitest';
import { shouldResetToIdleOnMissingSyncedSession } from './use-timer-sync-guards';

describe('useTimer sync recovery guard', () => {
    it('does not clear a restored synced timer while the first sync request is still loading', () => {
        expect(
            shouldResetToIdleOnMissingSyncedSession({
                syncedSession: null,
                isSyncLoading: true,
                activeSessionVersion: 3,
                phase: 'focus',
            })
        ).toBe(false);
    });

    it('clears a stale synced timer once sync finished and no server session exists', () => {
        expect(
            shouldResetToIdleOnMissingSyncedSession({
                syncedSession: null,
                isSyncLoading: false,
                activeSessionVersion: 3,
                phase: 'focus',
            })
        ).toBe(true);
    });
});
