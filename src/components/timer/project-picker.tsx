'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { MoreHorizontal, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import type { Project } from '@/lib/db/schema';

export interface ProjectPickerProps {
    readonly projects: ReadonlyArray<Project>;
    readonly selectedIds: ReadonlyArray<string>;
    readonly onToggle: (id: string) => void;
    readonly disabled?: boolean;
}

export const MAX_VISIBLE_PILLS = 4;

export function sortByUpdatedAt(a: Project, b: Project): number {
    return b.updatedAt.getTime() - a.updatedAt.getTime();
}

/**
 * Returns up to MAX_VISIBLE_PILLS projects for display as pills.
 * All selected projects are included even if not in top recent.
 * Multi-select: selected projects replace slots from the end.
 */
export function getVisibleProjects(
    projects: ReadonlyArray<Project>,
    selectedIds: ReadonlyArray<string>
): Project[] {
    if (projects.length === 0) return [];

    // Sort by recency
    const sorted = [...projects].sort(sortByUpdatedAt);

    // If 4 or fewer projects, return all
    if (sorted.length <= MAX_VISIBLE_PILLS) {
        return sorted;
    }

    // Get top projects
    const topProjects = sorted.slice(0, MAX_VISIBLE_PILLS);

    // If no selection, return top projects
    if (selectedIds.length === 0) {
        return topProjects;
    }

    // Find selected projects not in top
    const topIds = new Set(topProjects.map((p) => p.id));
    const selectedNotInTop = sorted
        .filter((p) => selectedIds.includes(p.id) && !topIds.has(p.id))
        .sort(sortByUpdatedAt); // Sort selected by updatedAt too

    // If all selected are already in top, return as-is
    if (selectedNotInTop.length === 0) {
        return topProjects;
    }

    // Replace slots from the end with selected projects not in top
    const slotsNeeded = selectedNotInTop.length;
    const keepFromTop = MAX_VISIBLE_PILLS - slotsNeeded;

    // Keep top projects that are either in the first slots OR are selected
    const topToKeep = topProjects.filter(
        (p, index) => index < keepFromTop || selectedIds.includes(p.id)
    );

    // If we kept more than keepFromTop (because some selected were in top),
    // we need to adjust
    const finalTopToKeep = topToKeep.slice(
        0,
        MAX_VISIBLE_PILLS - selectedNotInTop.length
    );

    return [...finalTopToKeep, ...selectedNotInTop];
}

export function ProjectPicker({
    projects,
    selectedIds,
    onToggle,
    disabled = false,
}: ProjectPickerProps) {
    const sortedProjects = useMemo(
        () => [...projects].sort(sortByUpdatedAt),
        [projects]
    );

    const visibleProjects = useMemo(
        () => getVisibleProjects(sortedProjects, selectedIds),
        [sortedProjects, selectedIds]
    );

    const hasMoreProjects = sortedProjects.length > MAX_VISIBLE_PILLS;

    // Combobox items for dropdown
    const comboboxItems = useMemo(
        () =>
            sortedProjects.map((p) => ({
                id: p.id,
                label: p.name,
                project: p,
            })),
        [sortedProjects]
    );

    if (sortedProjects.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]/60 p-4 text-sm text-[var(--text-secondary)]">
                <p>No projects yet. Create one to organize your tasks.</p>
                <Link
                    href="/projects"
                    className={cn(
                        'mt-3 inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] px-3 text-sm text-[var(--text-primary)] transition-colors',
                        'hover:bg-[var(--border)]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]'
                    )}
                >
                    Create project
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {visibleProjects.map((project) => {
                const isSelected = selectedIds.includes(project.id);

                return (
                    <button
                        key={project.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => onToggle(project.id)}
                        className={cn(
                            'flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors',
                            isSelected
                                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]'
                                : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                            disabled && 'cursor-not-allowed opacity-50'
                        )}
                        aria-pressed={isSelected}
                    >
                        {/* Color dot */}
                        <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: project.color }}
                        />
                        <span>{project.name}</span>
                        {/* X icon for selected pills */}
                        {isSelected && (
                            <X className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                        )}
                    </button>
                );
            })}
            {hasMoreProjects && (
                <Combobox
                    items={comboboxItems}
                    value={null}
                    onChange={(item) => onToggle(item.project.id)}
                    closeOnSelect={false}
                    searchPlaceholder="Search projects..."
                    emptyMessage="No projects found"
                    renderTrigger={({ open }) => (
                        <button
                            type="button"
                            disabled={disabled}
                            className={cn(
                                'flex items-center gap-1 rounded-full border px-3 py-2 text-sm transition-colors',
                                'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                                open &&
                                    'border-[var(--accent)] text-[var(--text-primary)]',
                                disabled && 'cursor-not-allowed opacity-50'
                            )}
                        >
                            <MoreHorizontal className="h-4 w-4" />
                            <span>More</span>
                        </button>
                    )}
                    renderItem={({ item }) => {
                        const isItemSelected = selectedIds.includes(item.id);
                        const project = item.project;
                        return (
                            <div className="flex items-center gap-2">
                                {/* Checkbox indicator */}
                                <div
                                    className={cn(
                                        'flex h-4 w-4 items-center justify-center rounded border',
                                        isItemSelected
                                            ? 'border-[var(--accent)] bg-[var(--accent)]'
                                            : 'border-[var(--border)]'
                                    )}
                                >
                                    {isItemSelected && (
                                        <Check className="h-3 w-3 text-white" />
                                    )}
                                </div>
                                {/* Color dot */}
                                <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: project.color }}
                                />
                                <span
                                    className={cn(
                                        'text-sm',
                                        isItemSelected && 'font-medium'
                                    )}
                                >
                                    {item.label}
                                </span>
                            </div>
                        );
                    }}
                />
            )}
        </div>
    );
}
