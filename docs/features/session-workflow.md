# Feature: Session Workflow

**Date:** 2026-03-09

This document consolidates manual session entry, session description support, and post-session edit/delete behavior.

## Scope

Users can:

- add completed sessions from the log page without running the timer,
- attach optional descriptions to sessions,
- edit or delete existing sessions from the daily log.

## Entry Points

- Manual add is triggered from the log header (`Add session` button).
- Edit/delete actions are triggered from a three-dot menu on each `SessionCard`.

## Manual Session Entry

### UI (`AddSessionDialog`)

Fields:

- task (required),
- focus mode (`short`, `average`, `deep`),
- optional projects (multi-select),
- optional description.

### Server Action (`addManualSession`)

Location: `src/actions/session-actions.ts`

Behavior:

- derives `durationSeconds` from selected focus mode,
- sets `startedAt` from selected log date and current time,
- sets `completedAt = startedAt + duration`,
- stores session with status `completed`,
- revalidates `/log`.

## Session Description

### Database

- `focus_sessions.description` is nullable text
- migration: `drizzle/0003_add_session_description.sql`

### Surfaces

- Timer start form (`SessionSetup`)
- Manual add dialog (`AddSessionDialog`)
- Session card display (`SessionCard`) when non-empty
- Session edit dialog (`EditSessionDialog`)

## Edit Session

### UI (`EditSessionDialog`)

Editable fields:

- task (required),
- description (optional),
- start time,
- end time.

The date is fixed to the original session date.

### Server Action (`updateSession`)

Location: `src/actions/session-actions.ts`

Behavior:

- validates task and time ordering (`completedAt > startedAt`),
- recalculates `durationSeconds`,
- enforces ownership by `userId`,
- revalidates `/log`.

## Delete Session

### UI (`DeleteSessionDialog`)

Confirmation-based destructive action from session menu.

### Server Action (`deleteSession`)

Location: `src/actions/session-actions.ts`

Behavior:

- verifies ownership,
- deletes `session_projects` links first, then `focus_sessions`,
- revalidates `/log`.

## Out Of Scope

- editing focus mode on existing sessions,
- editing project associations during session edit,
- bulk delete workflows,
- description truncation/expand UI.
