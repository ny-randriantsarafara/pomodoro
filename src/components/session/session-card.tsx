'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FOCUS_MODES } from '@/lib/constants';
import type { SessionWithProject } from '@/types';
import type { BadgeVariant } from '@/components/ui/badge';

interface SessionCardProps {
    readonly session: SessionWithProject;
}

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
    }
    return `${minutes}m`;
}

function formatTimeStarted(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

const FOCUS_MODE_BADGE_VARIANT: Record<
    SessionWithProject['focusMode'],
    BadgeVariant
> = {
    short: 'short',
    average: 'average',
    deep: 'deep',
};

const STATUS_BADGE_VARIANT: Record<SessionWithProject['status'], BadgeVariant> =
    {
        completed: 'completed',
        interrupted: 'interrupted',
        abandoned: 'abandoned',
    };

export function SessionCard({ session }: SessionCardProps) {
    const focusLabel = FOCUS_MODES[session.focusMode].label;

    return (
        <Card padding="md" className="animate-[fadeIn_0.3s_ease-out_forwards]">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: session.projectColor }}
                        aria-hidden
                    />
                    <span className="text-xs text-[var(--text-secondary)]">
                        {session.projectName}
                    </span>
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                    {session.task}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge
                        variant={FOCUS_MODE_BADGE_VARIANT[session.focusMode]}
                    >
                        {focusLabel}
                    </Badge>
                    <Badge variant={STATUS_BADGE_VARIANT[session.status]}>
                        {session.status}
                    </Badge>
                    <span className="text-xs text-[var(--text-secondary)]">
                        {formatDuration(session.durationSeconds)}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                        {formatTimeStarted(session.startedAt)}
                    </span>
                </div>
            </div>
        </Card>
    );
}
