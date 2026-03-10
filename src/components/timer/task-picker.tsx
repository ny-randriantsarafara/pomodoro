'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/db/schema';

export interface TaskPickerProps {
    readonly tasks: ReadonlyArray<Task>;
    readonly selectedTaskId: string | null;
    readonly onSelect: (task: Task) => void;
    readonly disabled?: boolean;
}

export function TaskPicker({
    tasks,
    selectedTaskId,
    onSelect,
    disabled = false,
}: TaskPickerProps) {
    const activeTasks = tasks.filter((task) => task.status === 'active');

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
        <div className="flex flex-wrap gap-2">
            {activeTasks.map((task) => {
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
    );
}
