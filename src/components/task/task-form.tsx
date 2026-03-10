'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createTask, updateTask } from '@/actions/task-actions';
import { validateTaskTitle } from '@/lib/validators';
import { TASK_MAX_LENGTH } from '@/lib/constants';
import type { Task } from '@/lib/db/schema';

interface TaskFormProps {
    readonly initialData?: Task;
    readonly onSuccess?: () => void;
}

function formatDateInput(value: Date | null): string {
    if (!value) return '';
    return value.toISOString().slice(0, 10);
}

export function TaskForm({ initialData, onSuccess }: TaskFormProps) {
    const [error, setError] = useState<string | null>(null);
    const [title, setTitle] = useState(initialData?.title ?? '');
    const [note, setNote] = useState(initialData?.note ?? '');
    const [dueDate, setDueDate] = useState(formatDateInput(initialData?.dueDate ?? null));
    const [estimatedPomodoros, setEstimatedPomodoros] = useState(
        initialData?.estimatedPomodoros?.toString() ?? ''
    );
    const [isPending, startTransition] = useTransition();

    const isEdit = Boolean(initialData);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        const titleError = validateTaskTitle(title);
        if (titleError) {
            setError(titleError);
            return;
        }

        startTransition(async () => {
            const formData = new FormData();
            formData.set('title', title.trim());
            formData.set('note', note.trim());
            formData.set('dueDate', dueDate);
            formData.set('estimatedPomodoros', estimatedPomodoros.trim());

            const result =
                isEdit && initialData
                    ? await updateTask(initialData.id, formData)
                    : await createTask(formData);

            if (result.success) {
                onSuccess?.();
                return;
            }

            setError(result.error);
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input
                label="Title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={TASK_MAX_LENGTH}
                required
                placeholder="What needs your attention?"
                autoFocus
            />

            <div className="flex flex-col gap-1.5">
                <label
                    htmlFor="task-note"
                    className="text-sm font-medium text-[var(--text-primary)]"
                >
                    Note
                </label>
                <textarea
                    id="task-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional context"
                    rows={3}
                    className="w-full rounded-lg border border-[#1F1F23] bg-[#141416] px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                    label="Due Date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                />
                <Input
                    label="Estimated Pomodoros"
                    inputMode="numeric"
                    value={estimatedPomodoros}
                    onChange={(e) => setEstimatedPomodoros(e.target.value)}
                    placeholder="Optional"
                />
            </div>

            {error ? (
                <p className="text-sm text-[var(--danger)]">{error}</p>
            ) : null}

            <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isPending}
                className="w-full"
            >
                {isPending ? 'Saving…' : isEdit ? 'Save Task' : 'Create Task'}
            </Button>
        </form>
    );
}
