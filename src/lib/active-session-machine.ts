export type ActiveSessionMachinePhase = 'focus' | 'shortBreak' | 'longBreak';

interface DeriveRemainingSecondsInput {
    readonly nowMs: number;
    readonly phaseStartedAtMs: number;
    readonly phaseDurationSeconds: number;
    readonly isPaused: boolean;
    readonly pausedAtMs: number | null;
    readonly totalPausedSeconds: number;
}

interface TransitionToNextPhaseInput {
    readonly currentPhase: ActiveSessionMachinePhase;
    readonly completedFocusCount: number;
    readonly longBreakFrequency: number;
    readonly shortBreakSeconds: number;
    readonly longBreakSeconds: number;
    readonly nextFocusSeconds: number;
}

interface TransitionToNextPhaseResult {
    readonly nextPhase: ActiveSessionMachinePhase;
    readonly nextDurationSeconds: number;
    readonly completedFocusCount: number;
}

export function deriveRemainingSeconds(
    input: DeriveRemainingSecondsInput
): number {
    const anchorMs =
        input.isPaused && input.pausedAtMs !== null
            ? input.pausedAtMs
            : input.nowMs;
    const elapsedSeconds =
        (anchorMs - input.phaseStartedAtMs) / 1000 - input.totalPausedSeconds;

    return Math.max(0, Math.ceil(input.phaseDurationSeconds - elapsedSeconds));
}

export function transitionToNextPhase(
    input: TransitionToNextPhaseInput
): TransitionToNextPhaseResult {
    if (input.currentPhase !== 'focus') {
        return {
            nextPhase: 'focus',
            nextDurationSeconds: input.nextFocusSeconds,
            completedFocusCount: input.completedFocusCount,
        };
    }

    const completedFocusCount = input.completedFocusCount + 1;
    const isLongBreak =
        completedFocusCount % input.longBreakFrequency === 0;

    if (isLongBreak) {
        return {
            nextPhase: 'longBreak',
            nextDurationSeconds: input.longBreakSeconds,
            completedFocusCount,
        };
    }

    return {
        nextPhase: 'shortBreak',
        nextDurationSeconds: input.shortBreakSeconds,
        completedFocusCount,
    };
}
