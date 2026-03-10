import { describe, expect, it } from 'vitest';
import { validateTaskTitle } from './validators';

describe('validateTaskTitle', () => {
    it('accepts a non-empty task title', () => {
        expect(validateTaskTitle('Write API tests')).toBeNull();
    });

    it('rejects an empty task title', () => {
        expect(validateTaskTitle('   ')).toBe('Task title is required');
    });
});
