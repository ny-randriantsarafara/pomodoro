# Design: Google OAuth, Project Filter, Browse Repos Fix, Token Refresh

**Date:** 2026-03-05

## 1. Google OAuth Login (Linked Accounts)

Add Google as a second Auth.js provider. Auth.js + Drizzle adapter supports automatic account linking when emails match across providers.

**Changes:**
- Add `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` env vars
- Add Google provider to `src/auth.ts`
- Update login page with Google sign-in button
- No schema changes needed — `accounts` table already supports multiple providers per user

**Behavior:** If a user signs in with Google and a user with that email already exists (from GitHub login), Auth.js links the Google account to the existing user. New emails create new users.

## 2. Project Filter on Timer Page

Add a search text input above the project tag grid in `SessionSetup` that filters projects by name as the user types.

**Changes:**
- Add search input in `src/components/timer/session-setup.tsx` above the project list
- Client-side filtering by project name (case-insensitive includes)
- Already-selected projects remain visible regardless of filter
- Compact the tag layout if needed

## 3. Browse Repos Bug Fix

**Root cause:** `RepoImportDialog` initializes `selectedConnectionId` from `preselectedConnectionId` on mount but never triggers the fetch. The fetch only fires via `handleConnectionChange`, which is only called from the `<Select>` onChange — but the Select is hidden when a preselectedConnectionId is provided.

**Fix:** Add `useEffect` in `repo-import-dialog.tsx`:
```ts
useEffect(() => {
  if (preselectedConnectionId) {
    handleConnectionChange(preselectedConnectionId);
  }
}, [preselectedConnectionId]);
```

## 4. GitHub Token Auto-Refresh

Store refresh tokens for GitHub connections and silently refresh expired access tokens.

**Changes:**
- Add `refreshToken` column to `githubConnections` table (new migration)
- Update OAuth callback (`/api/github/callback`) to store refresh token from GitHub response
- In `fetchReposForConnection`, if GitHub API returns 401:
  1. Use refresh token to request new access token
  2. Update stored tokens in DB
  3. Retry the request
- If refresh also fails, mark connection as needing re-auth (surface in UI)
- GitHub OAuth app must have "Enable device flow" or token refresh enabled in GitHub settings

**Note:** Classic OAuth apps issue non-expiring tokens by default. If using a GitHub App, refresh tokens are required. The implementation should handle both cases gracefully.
