'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import type { Task } from '@/lib/db/schema';

export interface TaskPickerProps {
    readonly tasks: ReadonlyArray<Task>;
    readonly selectedTaskId: string | null;
    readonly onSelect: (task: Task) => void;
    readonly onDeselect?: () => void;
    readonly disabled?: boolean;
}

export const MAX_VISIBLE_PILLS = 4;

export function sortByRecency(a: Task, b: Task): number {
    if (b.actualPomodoros !== a.actualPomodoros) {
        return b.actualPomodoros - a.actualPomodoros;
    }
    return b.updatedAt.getTime() - a.updatedAt.getTime();
}

/**
 * Returns up to MAX_VISIBLE_PILLS tasks for display as pills.
 * If selectedId points to a task not in the top recent, it replaces the 4th slot.
 */
export function getVisibleTasks(
    tasks: ReadonlyArray<Task>,
    selectedId: string | null
): Task[] {
    if (tasks.length === 0) return [];

    // Sort by recency
    const sorted = [...tasks].sort(sortByRecency);

    // If 4 or fewer tasks, return all
    if (sorted.length <= MAX_VISIBLE_PILLS) {
        return sorted;
    }

    // Get top tasks
    const topTasks = sorted.slice(0, MAX_VISIBLE_PILLS);

    // If no selection or selection is already in top tasks, return as-is
    if (!selectedId || topTasks.some((t) => t.id === selectedId)) {
        return topTasks;
    }

    // Selected task is not in top - find it and replace 4th slot
    const selectedTask = sorted.find((t) => t.id === selectedId);
    if (selectedTask) {
        return [...topTasks.slice(0, MAX_VISIBLE_PILLS - 1), selectedTask];
    }

    return topTasks;
}

export function TaskPicker({
    tasks,
    selectedTaskId,
    onSelect,
    onDeselect,
    disabled = false,
}: TaskPickerProps) {
    const activeTasks = useMemo(
        () =>
            tasks
                .filter((task) => task.status === 'active')
                .sort(sortByRecency),
        [tasks]
    );

    const visibleTasks = useMemo(
        () => getVisibleTasks(activeTasks, selectedTaskId),
        [activeTasks, selectedTaskId]
    );

    const hasMoreTasks = activeTasks.length > MAX_VISIBLE_PILLS;

    // Combobox items for dropdown
    const comboboxItems = useMemo(
        () => activeTasks.map((t) => ({ id: t.id, label: t.title, task: t })),
        [activeTasks]
    );

    const handlePillClick = (task: Task) => {
        if (task.id === selectedTaskId && onDeselect) {
            onDeselect();
        } else {
            onSelect(task);
        }
    };

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
        <div className="flex flex-wrap items-center gap-2">
            {visibleTasks.map((task) => {
                const isSelected = task.id === selectedTaskId;

                return (
                    <button
                        key={task.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => handlePillClick(task)}
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
            {hasMoreTasks && (
                <Combobox
                    items={comboboxItems}
                    value={selectedTaskId}
                    onChange={(item) => onSelect(item.task)}
                    searchPlaceholder="Search tasks..."
                    emptyMessage="No tasks found"
                    renderTrigger={({ open }) => (
                        <button
                            type="button"
                            disabled={disabled}
                            className={cn(
                                'flex items-center gap-1 rounded-full border px-3 py-2 text-sm transition-colors',
                                'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                                open && 'border-[var(--accent)] text-[var(--text-primary)]',
                                disabled && 'cursor-not-allowed opacity-50'
                            )}
                        >
                            <MoreHorizontal className="h-4 w-4" />
                            <span>More</span>
                        </button>
                    )}
                    renderItem={({ item, isSelected }) => (
                        <span
                            className={cn(
                                'text-sm',
                                isSelected && 'font-medium'
                            )}
                        >
                            {item.label}
                        </span>
                    )}
                />
            )}
        </div>
    );
}
