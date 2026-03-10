import type { ActiveTimer, TimerSettings } from '@/types';
import type {
    GuestSessionRecord,
    GuestTaskRecord,
    GuestWorkspace,
} from './guest-store';

export interface GuestImportPayload {
    readonly tasks: ReadonlyArray<GuestTaskRecord>;
    readonly sessions: ReadonlyArray<GuestSessionRecord>;
    readonly settings: TimerSettings;
    readonly activeTimer: ActiveTimer | null;
    readonly counts: {
        readonly tasks: number;
        readonly sessions: number;
        readonly hasActiveTimer: boolean;
    };
}

export function hasGuestWorkspaceData(workspace: GuestWorkspace | null): boolean {
    if (!workspace) return false;

    return (
        workspace.tasks.length > 0 ||
        workspace.sessions.length > 0 ||
        workspace.activeTimer !== null
    );
}

export function buildGuestImportPayload(
    workspace: GuestWorkspace
): GuestImportPayload {
    return {
        tasks: [...workspace.tasks],
        sessions: [...workspace.sessions],
        settings: workspace.settings,
        activeTimer: workspace.activeTimer,
        counts: {
            tasks: workspace.tasks.length,
            sessions: workspace.sessions.length,
            hasActiveTimer: workspace.activeTimer !== null,
        },
    };
}
