import { Card } from '@/components/ui/card';
import { formatDuration } from './overview-cards';
import type { TaskStats } from '@/types';

interface TaskLeaderboardProps {
    readonly taskStats: ReadonlyArray<TaskStats>;
}

export function TaskLeaderboard({ taskStats }: TaskLeaderboardProps) {
    if (taskStats.length === 0) {
        return (
            <Card padding="lg">
                <p className="text-center text-[var(--text-secondary)]">
                    No linked tasks yet. Start a session from an active task to
                    see task analytics.
                </p>
            </Card>
        );
    }

    return (
        <Card padding="md" className="p-0">
            <div className="divide-y divide-[var(--border)]">
                {taskStats.map((task, index) => (
                    <div
                        key={task.taskId}
                        className="flex items-center gap-4 px-6 py-4"
                    >
                        <span className="w-6 shrink-0 text-sm font-medium text-[var(--text-secondary)]">
                            {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">
                            {task.taskLabel}
                        </span>
                        <span className="shrink-0 text-sm text-[var(--accent)]">
                            {formatDuration(task.totalSeconds)}
                        </span>
                        <span className="shrink-0 text-sm text-[var(--text-secondary)]">
                            {task.sessionCount} session
                            {task.sessionCount !== 1 ? 's' : ''}
                        </span>
                    </div>
                ))}
            </div>
        </Card>
    );
}
