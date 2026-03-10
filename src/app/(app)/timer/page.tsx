import { getProjects } from '@/actions/project-actions';
import { getTasks } from '@/actions/task-actions';
import { TimerView } from './timer-view';

export default async function TimerPage() {
    const [projects, tasks] = await Promise.all([getProjects(), getTasks()]);

    return (
        <div className="flex min-h-[calc(100vh-0px)] flex-col items-center justify-center px-4 py-8">
            <div className="mx-auto w-full max-w-2xl">
                <TimerView projects={projects} tasks={tasks} />
            </div>
        </div>
    );
}
