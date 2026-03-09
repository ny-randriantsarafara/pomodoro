'use client';

import { useState, useCallback } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModeSelector } from '@/components/timer/mode-selector';
import { addManualSession } from '@/actions/session-actions';
import { TASK_MAX_LENGTH } from '@/lib/constants';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/db/schema';
import type { FocusMode } from '@/lib/db/schema';

interface AddSessionDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly date: Date;
    readonly projects: ReadonlyArray<Project>;
}

export function AddSessionDialog({ open, onClose, date, projects }: AddSessionDialogProps) {
    const [task, setTask] = useState('');
    const [description, setDescription] = useState('');
    const [focusMode, setFocusMode] = useState<FocusMode>('short');
    const [selectedIds, setSelectedIds] = useState<ReadonlyArray<string>>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canSubmit = task.trim() !== '' && !isSubmitting;

    const toggleProject = useCallback((id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
        );
    }, []);

    const handleClose = useCallback(() => {
        setTask('');
        setDescription('');
        setFocusMode('short');
        setSelectedIds([]);
        setError(null);
        onClose();
    }, [onClose]);

    const handleSubmit = async () => {
        setError(null);
        if (!canSubmit) return;
        setIsSubmitting(true);

        const result = await addManualSession({
            task: task.trim(),
            description: description.trim() || undefined,
            focusMode,
            projectIds: selectedIds,
            date,
        });

        if (result.success) {
            handleClose();
        } else {
            setError(result.error);
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={open} onClose={handleClose} title="Add session">
            <div className="flex flex-col gap-5">
                {projects.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--text-primary)]">
                            Projects{' '}
                            <span className="text-[var(--text-secondary)] font-normal">(optional)</span>
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
                    </div>
                )}

                <Input
                    label="Task"
                    placeholder="What did you work on?"
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    maxLength={TASK_MAX_LENGTH}
                    disabled={isSubmitting}
                    required
                />

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[var(--text-primary)]">
                        Description{' '}
                        <span className="text-[var(--text-secondary)] font-normal">(optional)</span>
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Any extra details?"
                        rows={2}
                        disabled={isSubmitting}
                        className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
                    />
                </div>

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

                {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

                <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    size="lg"
                    className="w-full"
                >
                    {isSubmitting ? 'Adding…' : 'Add session'}
                </Button>
            </div>
        </Dialog>
    );
}
