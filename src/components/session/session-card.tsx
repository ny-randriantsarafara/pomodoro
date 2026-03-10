'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FOCUS_MODES } from '@/lib/constants';
import { EditSessionDialog } from './edit-session-dialog';
import { DeleteSessionDialog } from './delete-session-dialog';
import type { SessionWithProjects } from '@/types';
import type { BadgeVariant } from '@/components/ui/badge';

interface SessionCardProps {
    readonly session: SessionWithProjects;
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

function formatDateParam(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const FOCUS_MODE_BADGE_VARIANT: Record<
    SessionWithProjects['focusMode'],
    BadgeVariant
> = {
    short: 'short',
    average: 'average',
    deep: 'deep',
};

const STATUS_BADGE_VARIANT: Record<SessionWithProjects['status'], BadgeVariant> =
    {
        completed: 'completed',
        interrupted: 'interrupted',
        abandoned: 'abandoned',
    };

export function SessionCard({ session }: SessionCardProps) {
    const focusLabel = FOCUS_MODES[session.focusMode].label;
    const [menuOpen, setMenuOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuOpen]);

    return (
        <>
            <Card padding="md" className="animate-[fadeIn_0.3s_ease-out_forwards]">
                <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap flex-1">
                            {session.projects.map((p) => (
                                <span
                                    key={p.id}
                                    className="inline-flex items-center gap-1.5"
                                >
                                    <span
                                        className="h-2 w-2 shrink-0 rounded-full"
                                        style={{ backgroundColor: p.color }}
                                        aria-hidden
                                    />
                                    <span className="text-xs text-[var(--text-secondary)]">
                                        {p.name}
                                    </span>
                                </span>
                            ))}
                        </div>

                        <div ref={menuRef} className="relative shrink-0">
                            <button
                                type="button"
                                onClick={() => setMenuOpen((v) => !v)}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--border)]/50 hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                                aria-label="Session options"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 top-8 z-10 min-w-[120px] rounded-lg border border-[var(--border)] bg-[#141416] py-1 shadow-lg">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            setEditOpen(true);
                                        }}
                                        className="w-full px-3 py-1.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--border)]/50"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            setDeleteOpen(true);
                                        }}
                                        className="w-full px-3 py-1.5 text-left text-sm text-[var(--danger)] hover:bg-[var(--border)]/50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {session.taskId ? (
                        <Link
                            href={`/log?date=${formatDateParam(session.startedAt)}&taskId=${session.taskId}`}
                            className="text-sm font-medium text-[var(--text-primary)] hover:underline"
                        >
                            {session.task}
                        </Link>
                    ) : (
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                            {session.task}
                        </p>
                    )}
                    {session.description && (
                        <p className="text-xs text-[var(--text-secondary)]">
                            {session.description}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={FOCUS_MODE_BADGE_VARIANT[session.focusMode]}>
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

            <EditSessionDialog
                key={session.id}
                open={editOpen}
                onClose={() => setEditOpen(false)}
                session={session}
            />
            <DeleteSessionDialog
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                sessionId={session.id}
            />
        </>
    );
}
