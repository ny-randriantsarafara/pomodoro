import { describe, expect, it } from 'vitest';
import { buildAppUrl } from './app-url';

describe('buildAppUrl', () => {
    it('prefers NEXTAUTH_URL over request origin', () => {
        const url = buildAppUrl('/settings', 'http://0.0.0.0:3000/api/github/callback', {
            NEXTAUTH_URL: 'https://pomodoro.nyhasinavalona.com',
        });

        expect(url.toString()).toBe('https://pomodoro.nyhasinavalona.com/settings');
    });

    it('falls back to request origin when NEXTAUTH_URL is missing', () => {
        const url = buildAppUrl('/settings', 'http://localhost:3000/api/github/callback', {});

        expect(url.toString()).toBe('http://localhost:3000/settings');
    });
});
