'use client';

import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { startSession } from '@/actions/session-actions';
import { FOCUS_MODES, TASK_MAX_LENGTH } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModeSelector } from './mode-selector';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/db/schema';
import type { FocusMode } from '@/lib/db/schema';
import type { StartTimerParams } from '@/types';

export interface SessionSetupProps {
    readonly projects: ReadonlyArray<Project>;
    readonly onStart: (params: StartTimerParams) => void;
}

export function SessionSetup({ projects, onStart }: SessionSetupProps) {
    const [selectedIds, setSelectedIds] = useState<ReadonlyArray<string>>([]);
    const [task, setTask] = useState('');
    const [focusMode, setFocusMode] = useState<FocusMode>('short');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canStart =
        selectedIds.length > 0 && task.trim() !== '' && !isSubmitting;

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

        const trimmedTask = task.trim();
        setIsSubmitting(true);

        const result = await startSession(selectedIds, trimmedTask, focusMode);

        if (result.success) {
            const selectedProjects = projects
                .filter((p) => selectedIds.includes(p.id))
                .map((p) => ({ id: p.id, name: p.name, color: p.color }));

            if (selectedProjects.length === 0) {
                setError('Selected projects not found');
                setIsSubmitting(false);
                return;
            }

            const durationSeconds = FOCUS_MODES[focusMode].workMinutes * 60;
            onStart({
                sessionId: result.data.id,
                projects: selectedProjects,
                task: trimmedTask,
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
                    Projects
                </label>
                <div className="flex flex-wrap gap-2">
                    {projects.map((p) => {
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
                {projects.length === 0 && (
                    <p className="text-sm text-[var(--text-secondary)]">
                        No projects yet. Create one first.
                    </p>
                )}
            </div>

            <Input
                label="Task"
                placeholder="What are you working on?"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                maxLength={TASK_MAX_LENGTH}
                disabled={isSubmitting}
                required
            />

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
