# OAuth, Filter, Bugfix, Token Refresh — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Google OAuth login, project search filter on timer page, fix Browse Repos bug, and add GitHub token auto-refresh.

**Architecture:** Four independent changes. Google OAuth uses Auth.js's built-in multi-provider + Drizzle adapter. Project filter is client-side state in SessionSetup. Browse Repos fix is a missing useEffect. Token refresh adds a refreshToken column and retry logic in the GitHub API layer.

**Tech Stack:** Next.js 16, Auth.js 5 (beta), Drizzle ORM, PostgreSQL, React 19

---

### Task 1: Fix Browse Repos Bug (smallest, quickest win)

**Files:**
- Modify: `src/components/project/repo-import-dialog.tsx:1-2,48-51`

**Step 1: Add useEffect import and auto-fetch hook**

In `src/components/project/repo-import-dialog.tsx`, add `useEffect` to the import on line 1:

```tsx
import { useState, useTransition, useMemo, useEffect } from 'react';
```

Then add this `useEffect` after the `handleClose` function (after line 119), before `const hasConnections`:

```tsx
useEffect(() => {
    if (open && preselectedConnectionId) {
        handleConnectionChange(preselectedConnectionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [open, preselectedConnectionId]);
```

We include `open` so it fires when the dialog opens, not just on mount. The eslint disable is needed because `handleConnectionChange` is not in deps (it's a plain function, not memoized, and including it would cause infinite loops).

**Step 2: Manually test**

1. Run `npm run dev`
2. Go to Settings, click "Browse Repos" on a connected GitHub account
3. Verify the dialog opens AND repos are fetched automatically
4. Also verify the repo import dialog from the Projects page still works (select from dropdown)

**Step 3: Commit**

```bash
git add src/components/project/repo-import-dialog.tsx
git commit -m "fix: auto-fetch repos when Browse Repos dialog opens with preselected connection"
```

---

### Task 2: Add Project Search Filter on Timer Page

**Files:**
- Modify: `src/components/timer/session-setup.tsx:1-4,20-26,72-113`

**Step 1: Add search state and filtering logic**

In `src/components/timer/session-setup.tsx`:

Add `useMemo` to the React import on line 3:
```tsx
import { useState, useCallback, useMemo } from 'react';
```

Add `Search` to the lucide import on line 4:
```tsx
import { X, Search } from 'lucide-react';
```

Add search state after `isSubmitting` state (after line 25):
```tsx
const [projectSearch, setProjectSearch] = useState('');
```

Add filtered projects memo after the state declarations (after the new search state):
```tsx
const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const query = projectSearch.toLowerCase();
    return projects.filter(
        (p) =>
            p.name.toLowerCase().includes(query) ||
            selectedIds.includes(p.id)
    );
}, [projects, projectSearch, selectedIds]);
```

**Step 2: Add search input to the JSX**

Replace the `<div className="flex flex-wrap gap-2">` block (lines 78-107) with:

```tsx
{projects.length > 6 && (
    <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input
            type="text"
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            placeholder="Filter projects..."
            className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            disabled={isSubmitting}
        />
    </div>
)}
<div className="flex flex-wrap gap-2">
    {filteredProjects.map((p) => {
        const isSelected = selectedIds.includes(p.id);
        return (
            <button
                key={p.id}
                type="button"
                disabled={isSubmitting}
                onClick={() => toggleProject(p.id)}
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                    isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]',
                    isSubmitting && 'cursor-not-allowed opacity-50'
                )}
            >
                <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: p.color }}
                    aria-hidden
                />
                <span className="truncate">{p.name}</span>
                {isSelected && (
                    <X className="h-3 w-3 shrink-0 text-[var(--text-secondary)]" aria-hidden />
                )}
            </button>
        );
    })}
    {projectSearch && filteredProjects.length === 0 && (
        <p className="text-sm text-[var(--text-secondary)]">
            No projects matching &ldquo;{projectSearch}&rdquo;
        </p>
    )}
</div>
```

Key details:
- Search input only shows when there are more than 6 projects (avoids clutter for small lists)
- Selected projects always remain visible even when filtered out (via `selectedIds.includes(p.id)` in filter)
- Uses the same search input styling as the repo import dialog for consistency

**Step 3: Manually test**

1. Go to timer page with 7+ projects
2. Type in the filter — verify projects filter as you type
3. Select a project, then filter it out by name — verify it stays visible
4. Clear filter — verify all projects show again

**Step 4: Commit**

```bash
git add src/components/timer/session-setup.tsx
git commit -m "feat: add search filter to project selector on timer page"
```

---

### Task 3: Add Google OAuth Login

**Files:**
- Modify: `src/lib/auth.ts:1-2,27`
- Modify: `src/app/(auth)/sign-in/page.tsx`
- Modify: `.env.example`

**Step 1: Add Google provider to auth config**

In `src/lib/auth.ts`, add the Google import after line 2:
```tsx
import Google from 'next-auth/providers/google';
```

Change line 27 from:
```tsx
providers: [GitHub],
```
to:
```tsx
providers: [GitHub, Google],
```

**Step 2: Update the sign-in page**

Replace `src/app/(auth)/sign-in/page.tsx` entirely:

```tsx
import { signIn } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';

async function signInWithGitHub() {
    'use server';
    await signIn('github', { redirectTo: '/timer' });
}

async function signInWithGoogle() {
    'use server';
    await signIn('google', { redirectTo: '/timer' });
}

function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden>
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    );
}

export default function SignInPage() {
    return (
        <div className="flex flex-col items-center gap-12 px-6">
            <div className="flex flex-col items-center gap-3">
                <h1 className="font-[family-name:var(--font-display)] text-5xl font-normal text-[var(--text-primary)]">
                    Pomodoro
                </h1>
                <p className="text-[var(--text-secondary)]">
                    Focus. Build. Ship.
                </p>
            </div>

            <div className="flex flex-col gap-3">
                <form action={signInWithGitHub}>
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full gap-2"
                    >
                        <Github className="size-5" aria-hidden />
                        Sign in with GitHub
                    </Button>
                </form>
                <form action={signInWithGoogle}>
                    <Button
                        type="submit"
                        variant="secondary"
                        size="lg"
                        className="w-full gap-2"
                    >
                        <GoogleIcon className="size-5" />
                        Sign in with Google
                    </Button>
                </form>
            </div>
        </div>
    );
}
```

**Step 3: Update .env.example**

Add after `AUTH_GITHUB_SECRET`:
```
AUTH_GOOGLE_ID=your-google-oauth-client-id
AUTH_GOOGLE_SECRET=your-google-oauth-client-secret
```

**Step 4: Configure Google OAuth credentials**

You need to create OAuth 2.0 credentials in Google Cloud Console:
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Authorized redirect URI: `https://pomodoro.nyhasinavalona.com/api/auth/callback/google` (and `http://localhost:3000/api/auth/callback/google` for dev)
4. Add `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` to `.env`

**Step 5: Test**

1. Run `npm run dev`
2. Go to `/sign-in` — verify both buttons appear
3. Click "Sign in with Google" — verify OAuth flow works
4. If you already have a GitHub account with the same email, verify the accounts are linked (same user, same data)

**Step 6: Commit**

```bash
git add src/lib/auth.ts src/app/\(auth\)/sign-in/page.tsx .env.example
git commit -m "feat: add Google OAuth as second login provider with account linking"
```

---

### Task 4: GitHub Token Auto-Refresh

**Files:**
- Modify: `src/lib/db/schema.ts:151-160` — add `refreshToken` column
- Modify: `src/app/api/github/callback/route.ts:8-55` — store refresh token
- Modify: `src/actions/github-actions.ts:23-44,66-91` — store refresh token, add retry logic
- Modify: `src/lib/github.ts:71-94` — return status code on error
- New migration after schema change

**Step 1: Add refreshToken column to schema**

In `src/lib/db/schema.ts`, add after line 158 (`accessToken`):

```tsx
refreshToken: text('refresh_token'),
```

**Step 2: Generate and run migration**

```bash
npm run db:generate
npm run db:migrate
```

**Step 3: Update OAuth callback to extract refresh token**

In `src/app/api/github/callback/route.ts`, update `exchangeCodeForToken` return type and extraction.

Replace the function signature (lines 8-10):
```tsx
async function exchangeCodeForToken(
    code: string
): Promise<{ accessToken: string; refreshToken: string | null } | { error: string }> {
```

After extracting `accessTokenVal` (after line 43), add:
```tsx
const refreshTokenVal = Object.getOwnPropertyDescriptor(
    raw,
    'refresh_token'
)?.value;
```

Replace the return on line 54:
```tsx
return {
    accessToken: accessTokenVal,
    refreshToken: typeof refreshTokenVal === 'string' ? refreshTokenVal : null,
};
```

Update `addGithubConnection` call (line 79-83) to pass refresh token:
```tsx
const result = await addGithubConnection(
    label,
    tokenResult.accessToken,
    username,
    tokenResult.refreshToken
);
```

**Step 4: Update addGithubConnection to accept refreshToken**

In `src/actions/github-actions.ts`, change the function signature (line 23):

```tsx
export async function addGithubConnection(
    label: string,
    accessToken: string,
    githubUsername: string,
    refreshToken: string | null = null
): Promise<ActionResult<GithubConnection>> {
```

Add `refreshToken` to the insert values (after line 39):
```tsx
.values({
    userId: user.id,
    label: label.trim(),
    githubUsername,
    accessToken,
    refreshToken,
})
```

**Step 5: Add token refresh utility to github.ts**

In `src/lib/github.ts`, add this function before `fetchUserRepos`:

```tsx
export async function refreshGitHubToken(
    refreshToken: string
): Promise<{ accessToken: string; refreshToken: string | null } | null> {
    const clientId = process.env.GITHUB_CONNECTIONS_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CONNECTIONS_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    });

    if (!response.ok) return null;

    const raw: unknown = await response.json();
    if (typeof raw !== 'object' || raw === null) return null;

    const accessTokenVal = getProperty(raw, 'access_token');
    const refreshTokenVal = getProperty(raw, 'refresh_token');

    if (typeof accessTokenVal !== 'string') return null;

    return {
        accessToken: accessTokenVal,
        refreshToken: typeof refreshTokenVal === 'string' ? refreshTokenVal : null,
    };
}
```

Also update `fetchUserRepos` to throw with the status code so callers can detect 401:

Change the error throw (line 85-86):
```tsx
if (!response.ok) {
    const err = new Error(`GitHub API error: ${response.status}`);
    (err as any).status = response.status;
    throw err;
}
```

**Step 6: Add retry logic in fetchReposForConnection**

Replace `fetchReposForConnection` in `src/actions/github-actions.ts` (lines 66-91):

```tsx
export async function fetchReposForConnection(
    connectionId: string
): Promise<ActionResult<ReadonlyArray<GitHubRepo>>> {
    const user = await requireAuth();
    const [connection] = await db
        .select()
        .from(githubConnections)
        .where(
            and(
                eq(githubConnections.id, connectionId),
                eq(githubConnections.userId, user.id)
            )
        );
    if (!connection) {
        return { success: false, error: 'Connection not found' };
    }

    try {
        const repos = await fetchUserRepos(connection.accessToken);
        return { success: true, data: repos };
    } catch (err: unknown) {
        // If 401 and we have a refresh token, try refreshing
        const status = (err as any)?.status;
        if (status === 401 && connection.refreshToken) {
            try {
                const refreshed = await refreshGitHubToken(connection.refreshToken);
                if (refreshed) {
                    // Update stored tokens
                    await db
                        .update(githubConnections)
                        .set({
                            accessToken: refreshed.accessToken,
                            ...(refreshed.refreshToken !== null
                                ? { refreshToken: refreshed.refreshToken }
                                : {}),
                        })
                        .where(eq(githubConnections.id, connectionId));

                    // Retry with new token
                    const repos = await fetchUserRepos(refreshed.accessToken);
                    return { success: true, data: repos };
                }
            } catch {
                // Refresh failed, fall through to error
            }
        }

        return {
            success: false,
            error: 'Failed to fetch repos. Token may be expired — try reconnecting.',
        };
    }
}
```

Add import at the top of `src/actions/github-actions.ts`:
```tsx
import { fetchUserRepos, refreshGitHubToken } from '@/lib/github';
```

(Replace the existing single import of `fetchUserRepos`.)

**Step 7: Test**

1. Connect a GitHub account in Settings
2. Browse repos — should work normally
3. To test token refresh: you'd need an expired token (hard to test locally with classic OAuth apps since tokens don't expire). Verify the code path compiles and doesn't break the happy path.

**Step 8: Commit**

```bash
git add src/lib/db/schema.ts src/app/api/github/callback/route.ts src/actions/github-actions.ts src/lib/github.ts drizzle/
git commit -m "feat: add GitHub token auto-refresh for expired connection tokens"
```

---

## Task Order

1. **Task 1** (Browse Repos fix) — 2 min, unblocks testing for Task 4
2. **Task 2** (Project filter) — 5 min, independent
3. **Task 3** (Google OAuth) — 5 min, independent
4. **Task 4** (Token refresh) — 10 min, builds on understanding from Task 1

Tasks 1-3 are independent and can be parallelized. Task 4 should come last since it touches more files.
