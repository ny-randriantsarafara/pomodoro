import { Card } from '@/components/ui/card';
import { formatDuration } from './overview-cards';
import type { ProjectStats } from '@/types';

interface ProjectLeaderboardProps {
    readonly projectStats: ReadonlyArray<ProjectStats>;
}

const RANK_BORDERS = [
    { rank: 1, color: '#FBBF24' },
    { rank: 2, color: '#94A3B8' },
    { rank: 3, color: '#CD7F32' },
] as const;

function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export function ProjectLeaderboard({ projectStats }: ProjectLeaderboardProps) {
    if (projectStats.length === 0) {
        return (
            <Card padding="lg">
                <p className="text-center text-[var(--text-secondary)]">
                    No sessions yet. Start focusing to see your project stats!
                </p>
            </Card>
        );
    }

    return (
        <Card padding="md" className="p-0">
            <div className="divide-y divide-[var(--border)]">
                {projectStats.map((project, index) => {
                    const rank = index + 1;
                    const borderAccent = RANK_BORDERS.find(
                        (r) => r.rank === rank
                    );
                    return (
                        <div
                            key={project.projectId}
                            className="flex items-center gap-4 px-6 py-4"
                            style={
                                borderAccent
                                    ? {
                                          borderLeft: `3px solid ${borderAccent.color}`,
                                          paddingLeft: '21px',
                                      }
                                    : undefined
                            }
                        >
                            <span className="w-6 shrink-0 text-sm font-medium text-[var(--text-secondary)]">
                                {rank}
                            </span>
                            <span
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{
                                    backgroundColor: project.projectColor,
                                }}
                            />
                            <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">
                                {project.projectName}
                            </span>
                            <span className="shrink-0 text-sm text-[var(--accent)]">
                                {formatDuration(project.totalSeconds)}
                            </span>
                            <span className="shrink-0 text-sm text-[var(--text-secondary)]">
                                {project.sessionCount} session
                                {project.sessionCount !== 1 ? 's' : ''}
                            </span>
                            <span className="shrink-0 text-sm text-[var(--text-secondary)]">
                                {project.lastSessionDate
                                    ? formatDate(project.lastSessionDate)
                                    : '—'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
