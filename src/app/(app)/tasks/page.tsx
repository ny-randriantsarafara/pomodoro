import { getTasks } from '@/actions/task-actions';
import { TaskList } from '@/components/task/task-list';

export default async function TasksPage() {
    const tasks = await getTasks();

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-8 p-6 lg:p-10">
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-[var(--text-primary)]">
                Tasks
            </h1>
            <TaskList tasks={tasks} />
        </div>
    );
}
