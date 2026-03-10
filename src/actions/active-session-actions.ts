'use server';

import type { ActiveSessionPhase } from '@/lib/db/schema';

export type ActiveSessionAction = 'pause' | 'resume' | 'skip' | 'stop';

interface VersionedRecord {
    readonly version: number;
}

interface NormalizePhaseActionInput {
    readonly currentPhase: ActiveSessionPhase;
    readonly action: ActiveSessionAction;
}

interface NormalizePhaseActionResult {
    readonly nextPhase: ActiveSessionPhase;
}

export function buildVersionedUpdate<T extends VersionedRecord>(record: T) {
    return {
        version: record.version + 1,
        updatedAt: new Date(),
    };
}

export function normalizePhaseAction(
    input: NormalizePhaseActionInput
): NormalizePhaseActionResult {
    if (input.action === 'skip') {
        if (input.currentPhase === 'focus') {
            return { nextPhase: 'shortBreak' };
        }

        return { nextPhase: 'focus' };
    }

    return {
        nextPhase: input.currentPhase,
    };
}
