'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/db/schema';

export interface TaskPickerProps {
    readonly tasks: ReadonlyArray<Task>;
    readonly selectedTaskId: string | null;
    readonly onSelect: (task: Task) => void;
    readonly disabled?: boolean;
}

const SEARCH_THRESHOLD = 5;

function sortByRecency(a: Task, b: Task): number {
    if (b.actualPomodoros !== a.actualPomodoros) {
        return b.actualPomodoros - a.actualPomodoros;
    }
    return b.updatedAt.getTime() - a.updatedAt.getTime();
}

export function TaskPicker({
    tasks,
    selectedTaskId,
    onSelect,
    disabled = false,
}: TaskPickerProps) {
    const [search, setSearch] = useState('');

    const activeTasks = useMemo(
        () =>
            tasks
                .filter((task) => task.status === 'active')
                .sort(sortByRecency),
        [tasks]
    );

    const filteredTasks = useMemo(() => {
        if (!search.trim()) return activeTasks;
        const query = search.toLowerCase();
        return activeTasks.filter(
            (t) =>
                t.title.toLowerCase().includes(query) ||
                t.id === selectedTaskId
        );
    }, [activeTasks, search, selectedTaskId]);

    if (activeTasks.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]/60 p-4 text-sm text-[var(--text-secondary)]">
                <p>
                    No active tasks yet. Pick one later, or use a quick task to
                    start now.
                </p>
                <Link
                    href="/tasks"
                    className={cn(
                        'mt-3 inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] px-3 text-sm text-[var(--text-primary)] transition-colors',
                        'hover:bg-[var(--border)]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]'
                    )}
                >
                    Open tasks
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {activeTasks.length > SEARCH_THRESHOLD && (
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Filter tasks..."
                        className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        disabled={disabled}
                    />
                </div>
            )}
            <div className="flex flex-wrap gap-2">
                {filteredTasks.map((task) => {
                    const isSelected = task.id === selectedTaskId;

                    return (
                        <button
                            key={task.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => onSelect(task)}
                            className={cn(
                                'rounded-full border px-3 py-2 text-sm transition-colors',
                                isSelected
                                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]'
                                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                                disabled && 'cursor-not-allowed opacity-50'
                            )}
                            aria-pressed={isSelected}
                        >
                            {task.title}
                        </button>
                    );
                })}
            </div>
            {search.trim() && filteredTasks.length === 0 && (
                <p className="text-sm text-[var(--text-secondary)]">
                    No tasks matching &ldquo;{search.trim()}&rdquo;
                </p>
            )}
        </div>
    );
}
