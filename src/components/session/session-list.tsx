'use client';

import Link from 'next/link';
import { SessionCard } from './session-card';
import type { SessionWithProjects } from '@/types';

interface SessionListProps {
    readonly sessions: ReadonlyArray<SessionWithProjects>;
    readonly activeTaskLabel?: string | null;
}

const STAGGER_DELAY_MS = 80;

export function SessionList({ sessions, activeTaskLabel }: SessionListProps) {
    if (sessions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-8 py-16 text-center">
                <p className="text-[var(--text-secondary)]">
                    {activeTaskLabel
                        ? `No sessions for ${activeTaskLabel} on this day yet.`
                        : 'No sessions yet. Start focusing!'}
                </p>
                <Link
                    href="/timer"
                    className="text-sm font-medium text-[var(--accent)] hover:underline"
                >
                    Go to Timer
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {activeTaskLabel ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                    Showing sessions linked to{' '}
                    <span className="font-medium text-[var(--text-primary)]">
                        {activeTaskLabel}
                    </span>
                    .
                </div>
            ) : null}
            <ul className="flex flex-col gap-3">
                {sessions.map((session, index) => (
                    <li
                        key={session.id}
                        className="animate-[fadeIn_0.3s_ease-out_both]"
                        style={{
                            animationDelay: `${index * STAGGER_DELAY_MS}ms`,
                        }}
                    >
                        <SessionCard session={session} />
                    </li>
                ))}
            </ul>
        </div>
    );
}
