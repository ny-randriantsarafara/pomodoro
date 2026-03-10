'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
    buildGuestImportPayload,
    hasGuestWorkspaceData,
} from '@/lib/guest-import';
import { loadGuestWorkspace } from '@/lib/guest-store';

export function GuestUpgradeBanner() {
    const [summary, setSummary] = useState<{
        sessions: number;
        tasks: number;
        hasActiveTimer: boolean;
    } | null>(null);

    useEffect(() => {
        const workspace = loadGuestWorkspace();
        if (!hasGuestWorkspaceData(workspace)) {
            setSummary(null);
            return;
        }

        const payload = buildGuestImportPayload(workspace!);
        setSummary({
            sessions: payload.counts.sessions,
            tasks: payload.counts.tasks,
            hasActiveTimer: payload.counts.hasActiveTimer,
        });
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
