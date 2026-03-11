'use client';

import { useState, useTransition } from 'react';
import { Check, Archive, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { TaskForm } from './task-form';
import { updateTaskStatus } from '@/actions/task-actions';
import type { Task } from '@/lib/db/schema';

interface TaskCardProps {
    readonly task: Task;
}

const dueDateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
});

export function formatDueDate(date: Date | null): string | null {
    if (!date) return null;
    return dueDateFormatter.format(date);
}

export function TaskCard({ task }: TaskCardProps) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    function handleStatusUpdate(action: 'complete' | 'archive') {
        setError(null);
        startTransition(async () => {
            const result = await updateTaskStatus(task.id, action);
            if (!result.success) {
                setError(result.error);
                return;
            }

            router.refresh();
        });
    }

    const dueDate = formatDueDate(task.dueDate);

    return (
        <Card className="h-full">
            <CardHeader className="mb-3 flex items-start justify-between gap-3">
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                        {task.title}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="default">{task.status}</Badge>
                        {task.estimatedPomodoros !== null ? (
                            <Badge variant="default">
                                {task.estimatedPomodoros} est.
                            </Badge>
                        ) : null}
                        {task.actualPomodoros > 0 ? (
                            <Badge variant="default">
                                {task.actualPomodoros} done
                            </Badge>
                        ) : null}
                    </div>
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditOpen(true)}
                    aria-label={`Edit ${task.title}`}
                    className="h-8 w-8 px-0"
                >
                    <Pencil className="h-4 w-4" aria-hidden />
                </Button>
            </CardHeader>

            {task.note ? (
                <p className="whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{task.note}</p>
            ) : null}

            {dueDate ? (
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                    Due {dueDate}
                </p>
            ) : null}

            {error ? (
                <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>
            ) : null}

            <CardFooter className="mt-6 flex flex-wrap gap-2">
                {task.status === 'active' ? (
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => handleStatusUpdate('complete')}
                        disabled={isPending}
                    >
                        <Check className="h-4 w-4" aria-hidden />
                        Complete
                    </Button>
                ) : null}

                {task.status !== 'archived' ? (
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusUpdate('archive')}
                        disabled={isPending}
                    >
                        <Archive className="h-4 w-4" aria-hidden />
                        Archive
                    </Button>
                ) : null}
            </CardFooter>

            <Dialog
                open={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                title="Edit Task"
            >
                <TaskForm
                    initialData={task}
                    onSuccess={() => {
                        setIsEditOpen(false);
                        router.refresh();
                    }}
                />
            </Dialog>
        </Card>
    );
}
