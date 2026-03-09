'use client';

import { useState, useCallback } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateSession } from '@/actions/session-actions';
import { TASK_MAX_LENGTH } from '@/lib/constants';
import type { SessionWithProjects } from '@/types';

interface EditSessionDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly session: SessionWithProjects;
}

function toTimeString(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function applyTimeToDate(base: Date, timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(base);
    result.setHours(hours, minutes, 0, 0);
    return result;
}

export function EditSessionDialog({ open, onClose, session }: EditSessionDialogProps) {
    const [task, setTask] = useState(session.task);
    const [description, setDescription] = useState(session.description ?? '');
    const [startTime, setStartTime] = useState(toTimeString(session.startedAt));
    const [endTime, setEndTime] = useState(
        session.completedAt ? toTimeString(session.completedAt) : toTimeString(session.startedAt)
    );
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canSubmit = task.trim() !== '' && !isSubmitting;

    const handleClose = useCallback(() => {
        setError(null);
        onClose();
    }, [onClose]);

    const handleSubmit = async () => {
        setError(null);
        if (!canSubmit) return;
        setIsSubmitting(true);

        const startedAt = applyTimeToDate(session.startedAt, startTime);
        const completedAt = applyTimeToDate(session.startedAt, endTime);

        const result = await updateSession(session.id, {
            task: task.trim(),
            description: description.trim() || undefined,
            startedAt,
            completedAt,
        });

        if (result.success) {
            handleClose();
        } else {
            setError(result.error);
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={open} onClose={handleClose} title="Edit session">
            <div className="flex flex-col gap-5">
                <Input
                    label="Task"
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
                        rows={2}
                        disabled={isSubmitting}
                        className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--text-primary)]">
                            Start time
                        </label>
                        <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            disabled={isSubmitting}
                            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--text-primary)]">
                            End time
                        </label>
                        <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            disabled={isSubmitting}
                            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
                        />
                    </div>
                </div>

                {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

                <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    size="lg"
                    className="w-full"
                >
                    {isSubmitting ? 'Saving…' : 'Save changes'}
                </Button>
            </div>
        </Dialog>
    );
}
