'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
    buildGuestImportPayload,
    hasGuestWorkspaceData,
} from '@/lib/guest-import';
import type { GuestWorkspace } from '@/lib/guest-store';
import { loadGuestWorkspace } from '@/lib/guest-store';

export function getGuestUpgradeSummary(workspace: GuestWorkspace | null) {
    if (!workspace || !hasGuestWorkspaceData(workspace)) {
        return null;
    }

    const payload = buildGuestImportPayload(workspace);
    return {
        sessions: payload.counts.sessions,
        tasks: payload.counts.tasks,
        hasActiveTimer: payload.counts.hasActiveTimer,
    };
}

export function GuestUpgradeBanner() {
    const [summary, setSummary] = useState<ReturnType<
        typeof getGuestUpgradeSummary
    >>(null);

    useEffect(() => {
        const syncSummary = () => {
            setSummary(getGuestUpgradeSummary(loadGuestWorkspace()));
        };

        const timeoutId = window.setTimeout(syncSummary, 0);
        window.addEventListener('storage', syncSummary);

        return () => {
            window.clearTimeout(timeoutId);
            window.removeEventListener('storage', syncSummary);
        };
    }, []);

    if (!summary) {
        return null;
    }

    return (
        <div className="w-full max-w-xl rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-4 py-4 text-sm text-[var(--text-primary)]">
            <p className="font-medium">
                Your local guest sessions are ready to import.
            </p>
            <p className="mt-1 text-[var(--text-secondary)]">
                {summary.sessions} session{summary.sessions !== 1 ? 's' : ''}
                {summary.tasks > 0 ? ` and ${summary.tasks} task${summary.tasks !== 1 ? 's' : ''}` : ''}
                {summary.hasActiveTimer ? ', plus an active local timer,' : ''}{' '}
                will be available the next time import is wired into sign-in.
            </p>
            <Link
                href="/guest/timer"
                className="mt-3 inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
            >
                Keep using guest mode
            </Link>
        </div>
    );
}
