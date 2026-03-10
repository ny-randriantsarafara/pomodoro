import { describe, expect, it } from 'vitest';
import { formatDateInput } from './task-form';

describe('formatDateInput', () => {
    it('preserves the UTC calendar day for date inputs', () => {
        expect(formatDateInput(new Date('2026-03-11T00:00:00.000Z'))).toBe(
            '2026-03-11'
        );
    });
});
