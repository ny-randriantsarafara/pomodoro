'use client';

import Link from 'next/link';
import { SessionCard } from './session-card';
import type { SessionWithProject } from '@/types';

interface SessionListProps {
    readonly sessions: ReadonlyArray<SessionWithProject>;
}

const STAGGER_DELAY_MS = 80;

export function SessionList({ sessions }: SessionListProps) {
    if (sessions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-8 py-16 text-center">
                <p className="text-[var(--text-secondary)]">
                    No sessions yet. Start focusing!
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
    );
}
