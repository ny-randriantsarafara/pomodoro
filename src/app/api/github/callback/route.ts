import { NextResponse } from 'next/server';
import { addGithubConnection } from '@/actions/github-actions';
import { fetchGitHubUsername } from '@/lib/github';
import { buildAppUrl } from '@/lib/app-url';

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

async function exchangeCodeForToken(
    code: string
): Promise<{ accessToken: string; refreshToken: string | null } | { error: string }> {
    const clientId = process.env.GITHUB_CONNECTIONS_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CONNECTIONS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return { error: 'GitHub OAuth not configured' };
    }

    const response = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
        }),
    });

    if (!response.ok) {
        return { error: 'Token exchange failed' };
    }

    const raw: unknown = await response.json();
    if (typeof raw !== 'object' || raw === null) {
        return { error: 'Invalid token response' };
    }

    const accessTokenVal = Object.getOwnPropertyDescriptor(
        raw,
        'access_token'
    )?.value;
    const refreshTokenVal = Object.getOwnPropertyDescriptor(
        raw,
        'refresh_token'
    )?.value;
    const errorVal = Object.getOwnPropertyDescriptor(raw, 'error')?.value;

    if (typeof errorVal === 'string') {
        return { error: errorVal };
    }

    if (typeof accessTokenVal !== 'string') {
        return { error: 'Missing access token' };
    }

    return {
        accessToken: accessTokenVal,
        refreshToken: typeof refreshTokenVal === 'string' ? refreshTokenVal : null,
    };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
        return NextResponse.redirect(
            buildAppUrl('/settings?error=github_auth_failed', request.url)
        );
    }

    const label = decodeURIComponent(state);

    const tokenResult = await exchangeCodeForToken(code);
    if ('error' in tokenResult) {
        return NextResponse.redirect(
            buildAppUrl('/settings?error=github_auth_failed', request.url)
        );
    }

    try {
        const username = await fetchGitHubUsername(tokenResult.accessToken);
        const result = await addGithubConnection(
            label,
            tokenResult.accessToken,
            username,
            tokenResult.refreshToken
        );

        if (!result.success) {
            return NextResponse.redirect(
                buildAppUrl('/settings?error=github_auth_failed', request.url)
            );
        }

        return NextResponse.redirect(buildAppUrl('/settings', request.url));
    } catch {
        return NextResponse.redirect(
            buildAppUrl('/settings?error=github_auth_failed', request.url)
        );
    }
}
