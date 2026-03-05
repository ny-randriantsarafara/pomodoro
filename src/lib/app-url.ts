interface AppUrlEnv {
    readonly NEXTAUTH_URL?: string;
    readonly AUTH_URL?: string;
}

function parseOrigin(url: string | undefined): string | null {
    if (!url) return null;

    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
}

export function getAppOrigin(
    requestUrl: string,
    env: AppUrlEnv = process.env as AppUrlEnv
): string {
    return (
        parseOrigin(env.NEXTAUTH_URL) ??
        parseOrigin(env.AUTH_URL) ??
        new URL(requestUrl).origin
    );
}

export function buildAppUrl(
    path: string,
    requestUrl: string,
    env: AppUrlEnv = process.env as AppUrlEnv
): URL {
    return new URL(path, getAppOrigin(requestUrl, env));
}
