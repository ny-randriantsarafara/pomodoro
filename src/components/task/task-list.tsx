'use client';

import { useMemo, useState } from 'react';
import { PlusSquare } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TaskCard } from './task-card';
import { TaskForm } from './task-form';
import type { Task } from '@/lib/db/schema';

interface TaskListProps {
    readonly tasks: ReadonlyArray<Task>;
}

export function TaskList({ tasks }: TaskListProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const sections = useMemo(
        () => ({
            active: tasks.filter((task) => task.status === 'active'),
            completed: tasks.filter((task) => task.status === 'completed'),
            archived: tasks.filter((task) => task.status === 'archived'),
        }),
        [tasks]
    );

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-[var(--text-secondary)]">
                    Plan the next focus blocks without going through projects first.
                </p>
                <Button type="button" onClick={() => setIsCreateOpen(true)}>
                    <PlusSquare className="h-4 w-4" aria-hidden />
                    New Task
                </Button>
            </div>

            {(['active', 'completed', 'archived'] as const).map((section) => {
                const sectionTasks = sections[section];
                if (sectionTasks.length === 0) return null;

                return (
                    <section key={section} className="space-y-4">
                        <h2 className="text-lg font-semibold capitalize text-[var(--text-primary)]">
                            {section}
                        </h2>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {sectionTasks.map((task) => (
                                <TaskCard key={task.id} task={task} />
                            ))}
                        </div>
                    </section>
                );
            })}

            {tasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#1F1F23] bg-[#141416]/50 p-10 text-center text-[var(--text-secondary)]">
                    No tasks yet. Create the first one and keep the timer setup lightweight.
                </div>
            ) : null}

            <Dialog
                open={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="New Task"
            >
                <TaskForm onSuccess={() => setIsCreateOpen(false)} />
            </Dialog>
        </div>
    );
}
