'use server';

import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth-utils';
import { validateProjectName, validateColor } from '@/lib/validators';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types';
import type { Project } from '@/lib/db/schema';

function getFormString(formData: FormData, key: string): string {
    return String(formData.get(key) ?? '');
}

function getFormStringOrNull(formData: FormData, key: string): string | null {
    const val = getFormString(formData, key).trim();
    return val || null;
}

export async function createProject(
    formData: FormData
): Promise<ActionResult<Project>> {
    const user = await requireAuth();

    const name = getFormString(formData, 'name');
    const description = getFormStringOrNull(formData, 'description');
    const color = getFormString(formData, 'color') || '#A0A0FF';
    const githubRepoUrl = getFormStringOrNull(formData, 'githubRepoUrl');
    const githubOwner = getFormStringOrNull(formData, 'githubOwner');
    const githubRepoName = getFormStringOrNull(formData, 'githubRepoName');

    const nameError = validateProjectName(name);
    if (nameError) {
        return { success: false, error: nameError };
    }

    const colorError = validateColor(color);
    if (colorError) {
        return { success: false, error: colorError };
    }

    try {
        const [project] = await db
            .insert(projects)
            .values({
                userId: user.id,
                name: name.trim(),
                description,
                color,
                githubRepoUrl,
                githubOwner,
                githubRepoName,
            })
            .returning();

        revalidatePath('/projects');
        revalidatePath('/timer');
        return { success: true, data: project };
    } catch (error) {
        if (String(error).includes('unique')) {
            return {
                success: false,
                error: 'A project with this name already exists',
            };
        }
        return { success: false, error: 'Failed to create project' };
    }
}

export async function getProjects(): Promise<ReadonlyArray<Project>> {
    const user = await requireAuth();

    return db
        .select()
        .from(projects)
        .where(eq(projects.userId, user.id))
        .orderBy(desc(projects.updatedAt));
}

export async function getProjectById(
    projectId: string
): Promise<Project | undefined> {
    const user = await requireAuth();

    const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));

    return project;
}

export async function updateProject(
    projectId: string,
    formData: FormData
): Promise<ActionResult<Project>> {
    const user = await requireAuth();

    const name = getFormString(formData, 'name');
    const description = getFormStringOrNull(formData, 'description');
    const color = getFormString(formData, 'color') || '#A0A0FF';

    const nameError = validateProjectName(name);
    if (nameError) {
        return { success: false, error: nameError };
    }

    const colorError = validateColor(color);
    if (colorError) {
        return { success: false, error: colorError };
    }

    try {
        const [project] = await db
            .update(projects)
            .set({
                name: name.trim(),
                description,
                color,
                updatedAt: new Date(),
            })
            .where(
                and(eq(projects.id, projectId), eq(projects.userId, user.id))
            )
            .returning();

        if (!project) {
            return { success: false, error: 'Project not found' };
        }

        revalidatePath('/projects');
        revalidatePath('/timer');
        return { success: true, data: project };
    } catch (error) {
        if (String(error).includes('unique')) {
            return {
                success: false,
                error: 'A project with this name already exists',
            };
        }
        return { success: false, error: 'Failed to update project' };
    }
}

export async function deleteProject(
    projectId: string
): Promise<ActionResult<void>> {
    const user = await requireAuth();

    const [deleted] = await db
        .delete(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
        .returning();

    if (!deleted) {
        return { success: false, error: 'Project not found' };
    }

    revalidatePath('/projects');
    revalidatePath('/timer');
    return { success: true, data: undefined };
}
