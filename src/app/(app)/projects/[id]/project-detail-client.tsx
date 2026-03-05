'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { deleteProject } from '@/actions/project-actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { ProjectForm } from '@/components/project/project-form';
import { FOCUS_MODES } from '@/lib/constants';
import type { Project } from '@/lib/db/schema';
import type { SessionWithProjects } from '@/types';

import type { BadgeVariant } from '@/components/ui/badge';

interface ProjectDetailClientProps {
    readonly project: Project;
    readonly sessions: ReadonlyArray<SessionWithProjects>;
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

export function ProjectDetailClient({
    project,
    sessions,
}: ProjectDetailClientProps) {
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    async function handleDelete() {
        setIsDeleting(true);
        const result = await deleteProject(project.id);
        setIsDeleting(false);
        if (result.success) {
            setDeleteOpen(false);
            router.push('/projects');
        }
    }

    return (
        <div className="flex flex-col gap-8 p-6 lg:p-10">
            <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                    <span
                        className="mt-1.5 h-4 w-4 shrink-0 rounded-full"
                        style={{ backgroundColor: project.color }}
                        aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                        <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-[var(--text-primary)]">
                            {project.name}
                        </h1>
                        {project.description ? (
                            <p className="mt-2 text-[var(--text-secondary)]">
                                {project.description}
                            </p>
                        ) : null}
                        {project.githubRepoUrl ? (
                            <a
                                href={project.githubRepoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-2 text-[var(--accent)] hover:underline"
                            >
                                <ExternalLink className="h-4 w-4" aria-hidden />
                                GitHub Repository
                            </a>
                        ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditOpen(true)}
                            className="gap-2"
                        >
                            <Pencil className="h-4 w-4" aria-hidden />
                            Edit
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteOpen(true)}
                            className="gap-2"
                        >
                            <Trash2 className="h-4 w-4" aria-hidden />
                            Delete
                        </Button>
                    </div>
                </div>
            </div>

            <section>
                <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl font-normal text-[var(--text-primary)]">
                    Session history
                </h2>
                {sessions.length > 0 ? (
                    <ul className="space-y-3">
                        {sessions.map((session) => {
                            const modeVariant: BadgeVariant = session.focusMode;
                            const statusVariant: BadgeVariant = session.status;
                            return (
                                <li
                                    key={session.id}
                                    className="flex flex-wrap items-center gap-2 rounded-lg border border-[#1F1F23] bg-[#141416] px-4 py-3"
                                >
                                    <span className="flex items-center gap-1">
                                        {session.projects.map((p) => (
                                            <span
                                                key={p.id}
                                                className="h-2 w-2 shrink-0 rounded-full"
                                                style={{ backgroundColor: p.color }}
                                                aria-hidden
                                            />
                                        ))}
                                    </span>
                                    <span className="font-medium text-[var(--text-primary)]">
                                        {session.task}
                                    </span>
                                    <Badge variant={modeVariant}>
                                        {FOCUS_MODES[session.focusMode].label}
                                    </Badge>
                                    <Badge variant={statusVariant}>
                                        {session.status}
                                    </Badge>
                                    <span className="text-sm text-[var(--text-secondary)]">
                                        {formatDuration(session.durationSeconds)}
                                    </span>
                                    <span className="text-sm text-[var(--text-secondary)]">
                                        {formatDateTime(session.startedAt)}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-[var(--text-secondary)]">
                        No sessions yet for this project.
                    </p>
                )}
            </section>

            <Dialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                title="Edit Project"
            >
                <ProjectForm
                    initialData={project}
                    onSuccess={() => {
                        setEditOpen(false);
                        router.refresh();
                    }}
                />
            </Dialog>

            <Dialog
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                title="Delete project"
            >
                <div className="space-y-4">
                    <p className="text-[var(--text-secondary)]">
                        Are you sure you want to delete &quot;{project.name}
                        &quot;? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setDeleteOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting…' : 'Delete'}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
