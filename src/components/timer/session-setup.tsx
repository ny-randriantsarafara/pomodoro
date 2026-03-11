'use client';

import { useState, useCallback, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { startSession } from '@/actions/session-actions';
import { FOCUS_MODES, TASK_MAX_LENGTH } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModeSelector } from './mode-selector';
import { TaskPicker } from './task-picker';
import { cn } from '@/lib/utils';
import type { Project, Task } from '@/lib/db/schema';
import type { FocusMode } from '@/lib/db/schema';
import type { StartTimerParams } from '@/types';

export interface SessionSetupProps {
    readonly projects: ReadonlyArray<Project>;
    readonly tasks: ReadonlyArray<Task>;
    readonly sessionMode?: 'signed-in' | 'guest';
    readonly onStart: (params: StartTimerParams) => void;
}

export function SessionSetup({
    projects,
    tasks,
    sessionMode = 'signed-in',
    onStart,
}: SessionSetupProps) {
    const [selectedIds, setSelectedIds] = useState<ReadonlyArray<string>>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [quickTask, setQuickTask] = useState('');
    const [description, setDescription] = useState('');
    const [focusMode, setFocusMode] = useState<FocusMode>('short');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [projectSearch, setProjectSearch] = useState('');

    const filteredProjects = useMemo(() => {
        if (!projectSearch.trim()) return projects;
        const query = projectSearch.toLowerCase();
        return projects.filter(
            (p) =>
                p.name.toLowerCase().includes(query) ||
                selectedIds.includes(p.id)
        );
    }, [projects, projectSearch, selectedIds]);

    const selectedTask =
        tasks.find((task) => task.id === selectedTaskId) ?? null;
    const trimmedQuickTask = quickTask.trim();
    const sessionTask = selectedTask?.title ?? trimmedQuickTask;

    const canStart = sessionTask !== '' && !isSubmitting;

    const toggleProject = useCallback((id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id)
                ? prev.filter((pid) => pid !== id)
                : [...prev, id]
        );
    }, []);

    const handleSubmit = async () => {
        setError(null);
        if (!canStart) return;

        const durationSeconds = FOCUS_MODES[focusMode].workMinutes * 60;

        if (sessionMode === 'guest') {
            onStart({
                sessionId: `guest-${crypto.randomUUID()}`,
                taskId: selectedTask?.id,
                projects: [],
                task: sessionTask,
                description: description.trim() || undefined,
                focusMode,
                durationSeconds,
            });
            return;
        }

        setIsSubmitting(true);

        const result = await startSession(
            selectedIds,
            sessionTask,
            focusMode,
            description.trim() || undefined,
            selectedTask?.id
        );

        if (result.success) {
            const selectedProjects = projects
                .filter((p) => selectedIds.includes(p.id))
                .map((p) => ({ id: p.id, name: p.name, color: p.color }));

            onStart({
                sessionId: result.data.id,
                taskId: selectedTask?.id,
                projects: selectedProjects,
                task: sessionTask,
                description: description.trim() || undefined,
                focusMode,
                durationSeconds,
            });
        } else {
            setError(result.error);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                    Task
                </label>
                <TaskPicker
                    tasks={tasks}
                    selectedTaskId={selectedTaskId}
                    onSelect={(task) => setSelectedTaskId(task.id)}
                    disabled={isSubmitting}
                />
                <Input
                    label="Quick task"
                    placeholder="Or type what you're about to work on"
                    value={quickTask}
                onChange={(event) => setQuickTask(event.target.value)}
                maxLength={TASK_MAX_LENGTH}
                disabled={isSubmitting}
                />
                {selectedTask ? (
                    <p className="text-sm text-[var(--text-secondary)]">
                        Starting a focus block for
                        <span className="font-medium text-[var(--text-primary)]">
                            {selectedTask.title}
                        </span>
                        .
                    </p>
                ) : trimmedQuickTask ? (
                    <p className="text-sm text-[var(--text-secondary)]">
                        Starting a focus block for
                        <span className="font-medium text-[var(--text-primary)]">
                            {trimmedQuickTask}
                        </span>
                        .
                    </p>
                ) : null}
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                    Projects{' '}
                    <span className="font-normal text-[var(--text-secondary)]">
                        (optional)
                    </span>
                </label>
                {projects.length > 6 && (
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                        <input
                            type="text"
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            placeholder="Filter projects..."
                            className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                            disabled={isSubmitting}
                        />
                    </div>
                )}
                <div className="flex flex-wrap gap-2">
                    {filteredProjects.map((p) => {
                        const isSelected = selectedIds.includes(p.id);
                        return (
                            <button
                                key={p.id}
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => toggleProject(p.id)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                                    isSelected
                                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]'
                                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]',
                                    isSubmitting && 'cursor-not-allowed opacity-50'
                                )}
                            >
                                <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: p.color }}
                                    aria-hidden
                                />
                                <span className="truncate">{p.name}</span>
                                {isSelected && (
                                    <X className="h-3 w-3 shrink-0 text-[var(--text-secondary)]" aria-hidden />
                                )}
                            </button>
                        );
                    })}
                </div>
                {projectSearch && filteredProjects.length === 0 && (
                    <p className="text-sm text-[var(--text-secondary)]">
                        No projects matching &ldquo;{projectSearch}&rdquo;
                    </p>
                )}
                {projects.length === 0 && (
                    <p className="text-sm text-[var(--text-secondary)]">
                        No projects yet. You can still start a task-only session.
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                    Description{' '}
                    <span className="text-[var(--text-secondary)] font-normal">(optional)</span>
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What specifically are you doing?"
                    rows={2}
                    disabled={isSubmitting}
                    className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
                />
            </div>

            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                    Focus mode
                </label>
                <ModeSelector
                    selectedMode={focusMode}
                    onSelect={setFocusMode}
                    disabled={isSubmitting}
                />
            </div>

            <Button
                onClick={handleSubmit}
                disabled={!canStart}
                size="lg"
                className="w-full"
            >
                Start
            </Button>
        </div>
    );
}
