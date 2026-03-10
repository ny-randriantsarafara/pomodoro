import type { ActiveSessionSnapshot } from '@/types';

interface MissingSyncedSessionResetInput {
    readonly syncedSession: ActiveSessionSnapshot | null;
    readonly isSyncLoading: boolean;
    readonly activeSessionVersion?: number;
    readonly phase: 'idle' | 'focus' | 'break';
}

export function shouldResetToIdleOnMissingSyncedSession(
    input: MissingSyncedSessionResetInput
): boolean {
    if (input.syncedSession || input.isSyncLoading) {
        return false;
    }

    return (
        input.activeSessionVersion !== undefined || input.phase === 'break'
    );
}
