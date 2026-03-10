import { describe, it, expect } from 'vitest';
import {
    validateProjectName,
    validateTask,
    validateTaskTitle,
    validateGithubLabel,
    validateColor,
} from './validators';

describe('validateProjectName', () => {
    it('returns null for valid name', () => {
        expect(validateProjectName('My Project')).toBeNull();
    });

    it('rejects empty string', () => {
        expect(validateProjectName('')).toBe('Project name is required');
    });

    it('rejects whitespace-only string', () => {
        expect(validateProjectName('   ')).toBe('Project name is required');
    });

    it('rejects name over 100 characters', () => {
        const long = 'a'.repeat(101);
        expect(validateProjectName(long)).toContain('at most 100');
    });
});

describe('validateTask', () => {
    it('returns null for valid task', () => {
        expect(validateTask('Fix the auth bug')).toBeNull();
    });

    it('rejects empty string', () => {
        expect(validateTask('')).toBe('Task description is required');
    });

    it('rejects task over 500 characters', () => {
        const long = 'a'.repeat(501);
        expect(validateTask(long)).toContain('at most 500');
    });
});

describe('validateTaskTitle', () => {
    it('returns null for valid title', () => {
        expect(validateTaskTitle('Plan the rollout')).toBeNull();
    });

    it('rejects empty string', () => {
        expect(validateTaskTitle('')).toBe('Task title is required');
    });
});

describe('validateGithubLabel', () => {
    it('returns null for valid label', () => {
        expect(validateGithubLabel('personal')).toBeNull();
    });

    it('rejects empty string', () => {
        expect(validateGithubLabel('')).toBe('Label is required');
    });

    it('rejects label over 50 characters', () => {
        const long = 'a'.repeat(51);
        expect(validateGithubLabel(long)).toContain('at most 50');
    });
});

describe('validateColor', () => {
    it('returns null for valid hex color', () => {
        expect(validateColor('#A0A0FF')).toBeNull();
    });

    it('rejects invalid format', () => {
        expect(validateColor('red')).toContain('valid hex');
        expect(validateColor('#FFF')).toContain('valid hex');
        expect(validateColor('#GGGGGG')).toContain('valid hex');
    });
});
