'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { loadTimer } from '@/hooks/use-timer-persistence';
import { cn } from '@/lib/utils';
import type { SessionProjectRef } from '@/types';

function formatRemainingTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secondsPart = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(secondsPart).padStart(2, '0')}`;
}

function computeLocalRemainingSeconds() {
    const timer = loadTimer();
    if (!timer) {
        return { timer: null, remainingSeconds: 0 };
    }

    const anchorMs =
        timer.isPaused && timer.pausedAt !== null ? timer.pausedAt : Date.now();
    const elapsedSeconds =
        (anchorMs - timer.startedAt) / 1000 - timer.totalPausedSeconds;

    return {
        timer,
        remainingSeconds: Math.max(
            0,
            Math.ceil(timer.durationSeconds - elapsedSeconds)
        ),
    };
}

export function ActiveSessionBanner() {
    const pathname = usePathname();
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const [task, setTask] = useState<string | null>(null);
    const [projects, setProjects] = useState<
        ReadonlyArray<SessionProjectRef>
    >([]);

    useEffect(() => {
        const tick = () => {
            const local = computeLocalRemainingSeconds();
            setRemainingSeconds(local.remainingSeconds);
            setTask(local.timer?.task ?? null);
            setProjects(local.timer?.projects ?? []);
        };

        tick();
        const intervalId = window.setInterval(tick, 1000);
        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    if (pathname === '/timer') {
        return null;
    }

    const taskLabel = task?.trim() || 'Active session';

    if (!task) {
        return null;
    }

    return (
        <Link
            href="/timer"
            className={cn(
                'sticky top-0 z-10 flex w-full items-center justify-center gap-2 border-b px-4 py-1.5 text-sm',
                'bg-[var(--surface)] text-[var(--text-secondary)]',
                'animate-[fadeIn_0.3s_ease-out]'
            )}
            style={{ borderBottomWidth: 1, borderBottomColor: 'var(--accent)' }}
        >
            <span className="flex shrink-0 items-center gap-1">
                {projects.map((project) => (
                    <span
                        key={project.id}
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: project.color }}
                        aria-hidden
                    />
                ))}
            </span>
            <span className="truncate font-medium text-[var(--text-primary)]">
                {taskLabel}
            </span>
            <span>—</span>
            <span
                className="font-mono tabular-nums"
                style={{ fontFamily: 'var(--font-mono)' }}
            >
                {formatRemainingTime(remainingSeconds)}
            </span>
        </Link>
    );
}
