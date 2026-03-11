import { describe, it, expect } from 'vitest';
import type { Project } from '@/lib/db/schema';
import {
    sortByUpdatedAt,
    getVisibleProjects,
    MAX_VISIBLE_PILLS,
} from './project-picker';

function makeProject(overrides: Partial<Project> = {}): Project {
    return {
        id: crypto.randomUUID(),
        userId: 'user-1',
        name: 'Project',
        description: null,
        githubRepoUrl: null,
        githubOwner: null,
        githubRepoName: null,
        color: '#A0A0FF',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        ...overrides,
    };
}

describe('sortByUpdatedAt', () => {
    it('sorts by updatedAt descending (most recent first)', () => {
        const a = makeProject({
            name: 'A',
            updatedAt: new Date('2026-01-01'),
        });
        const b = makeProject({
            name: 'B',
            updatedAt: new Date('2026-03-01'),
        });
        const c = makeProject({
            name: 'C',
            updatedAt: new Date('2026-02-01'),
        });
        const sorted = [a, b, c].sort(sortByUpdatedAt);
        expect(sorted.map((p) => p.name)).toEqual(['B', 'C', 'A']);
    });
});

describe('getVisibleProjects', () => {
    it('returns up to MAX_VISIBLE_PILLS projects', () => {
        const projects = [
            makeProject({ name: 'A', updatedAt: new Date('2026-06-01') }),
            makeProject({ name: 'B', updatedAt: new Date('2026-05-01') }),
            makeProject({ name: 'C', updatedAt: new Date('2026-04-01') }),
            makeProject({ name: 'D', updatedAt: new Date('2026-03-01') }),
            makeProject({ name: 'E', updatedAt: new Date('2026-02-01') }),
            makeProject({ name: 'F', updatedAt: new Date('2026-01-01') }),
        ];

        const visible = getVisibleProjects(projects, []);

        expect(visible).toHaveLength(MAX_VISIBLE_PILLS);
        expect(visible.map((p) => p.name)).toEqual(['A', 'B', 'C', 'D']);
    });

    it('returns all projects when fewer than MAX_VISIBLE_PILLS', () => {
        const projects = [
            makeProject({ name: 'A', updatedAt: new Date('2026-02-01') }),
            makeProject({ name: 'B', updatedAt: new Date('2026-01-01') }),
        ];

        const visible = getVisibleProjects(projects, []);

        expect(visible).toHaveLength(2);
        expect(visible.map((p) => p.name)).toEqual(['A', 'B']);
    });

    it('includes selected projects even if not in top recent', () => {
        const lowPriorityProject = makeProject({
            id: 'selected-id',
            name: 'Selected',
            updatedAt: new Date('2020-01-01'),
        });
        const projects = [
            makeProject({ name: 'A', updatedAt: new Date('2026-06-01') }),
            makeProject({ name: 'B', updatedAt: new Date('2026-05-01') }),
            makeProject({ name: 'C', updatedAt: new Date('2026-04-01') }),
            makeProject({ name: 'D', updatedAt: new Date('2026-03-01') }),
            makeProject({ name: 'E', updatedAt: new Date('2026-02-01') }),
            lowPriorityProject,
        ];

        const visible = getVisibleProjects(projects, ['selected-id']);

        expect(visible).toHaveLength(MAX_VISIBLE_PILLS);
        expect(visible.map((p) => p.name)).toContain('Selected');
        // Selected replaces 4th slot, so we get A, B, C, Selected
        expect(visible.map((p) => p.name)).toEqual(['A', 'B', 'C', 'Selected']);
    });

    it('keeps selected project in place if already in top recent', () => {
        const selectedProject = makeProject({
            id: 'selected-id',
            name: 'B',
            updatedAt: new Date('2026-05-01'),
        });
        const projects = [
            makeProject({ name: 'A', updatedAt: new Date('2026-06-01') }),
            selectedProject,
            makeProject({ name: 'C', updatedAt: new Date('2026-04-01') }),
            makeProject({ name: 'D', updatedAt: new Date('2026-03-01') }),
            makeProject({ name: 'E', updatedAt: new Date('2026-02-01') }),
        ];

        const visible = getVisibleProjects(projects, ['selected-id']);

        expect(visible).toHaveLength(MAX_VISIBLE_PILLS);
        // B stays in its natural position (2nd)
        expect(visible.map((p) => p.name)).toEqual(['A', 'B', 'C', 'D']);
    });

    it('includes all selected projects in multi-select scenario', () => {
        const selected1 = makeProject({
            id: 'sel-1',
            name: 'Selected1',
            updatedAt: new Date('2020-01-01'),
        });
        const selected2 = makeProject({
            id: 'sel-2',
            name: 'Selected2',
            updatedAt: new Date('2020-02-01'),
        });
        const projects = [
            makeProject({ name: 'A', updatedAt: new Date('2026-06-01') }),
            makeProject({ name: 'B', updatedAt: new Date('2026-05-01') }),
            makeProject({ name: 'C', updatedAt: new Date('2026-04-01') }),
            makeProject({ name: 'D', updatedAt: new Date('2026-03-01') }),
            makeProject({ name: 'E', updatedAt: new Date('2026-02-01') }),
            selected1,
            selected2,
        ];

        const visible = getVisibleProjects(projects, ['sel-1', 'sel-2']);

        expect(visible).toHaveLength(MAX_VISIBLE_PILLS);
        // Both selected projects should be included
        expect(visible.map((p) => p.name)).toContain('Selected1');
        expect(visible.map((p) => p.name)).toContain('Selected2');
        // They replace slots 3 and 4, so we get A, B, Selected2, Selected1
        // (Selected2 has more recent updatedAt among selected)
        expect(visible.map((p) => p.name)).toEqual([
            'A',
            'B',
            'Selected2',
            'Selected1',
        ]);
    });

    it('handles when some selected projects are in top and some not', () => {
        const selected1 = makeProject({
            id: 'sel-1',
            name: 'B', // In top recent
            updatedAt: new Date('2026-05-01'),
        });
        const selected2 = makeProject({
            id: 'sel-2',
            name: 'Selected2', // Not in top recent
            updatedAt: new Date('2020-01-01'),
        });
        const projects = [
            makeProject({ name: 'A', updatedAt: new Date('2026-06-01') }),
            selected1,
            makeProject({ name: 'C', updatedAt: new Date('2026-04-01') }),
            makeProject({ name: 'D', updatedAt: new Date('2026-03-01') }),
            makeProject({ name: 'E', updatedAt: new Date('2026-02-01') }),
            selected2,
        ];

        const visible = getVisibleProjects(projects, ['sel-1', 'sel-2']);

        expect(visible).toHaveLength(MAX_VISIBLE_PILLS);
        // B is already in top, Selected2 replaces 4th slot
        expect(visible.map((p) => p.name)).toContain('B');
        expect(visible.map((p) => p.name)).toContain('Selected2');
        expect(visible.map((p) => p.name)).toEqual([
            'A',
            'B',
            'C',
            'Selected2',
        ]);
    });

    it('returns empty array for empty projects', () => {
        const visible = getVisibleProjects([], []);
        expect(visible).toEqual([]);
    });
});
