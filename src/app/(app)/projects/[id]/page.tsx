import { notFound } from 'next/navigation';
import { getProjectById } from '@/actions/project-actions';
import { getSessionsByProject } from '@/actions/session-actions';
import { ProjectDetailClient } from './project-detail-client';

interface PageProps {
    readonly params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
    const { id } = await params;
    const project = await getProjectById(id);

    if (!project) {
        notFound();
    }

    const sessions = await getSessionsByProject(id);

    return <ProjectDetailClient project={project} sessions={sessions} />;
}
