# Feature: Session Edit & Delete

**Date:** 2026-03-09

## Overview

Session cards in the daily log expose a three-dot menu for two post-session actions:

1. **Edit** — patch task, description, start time, and end time
2. **Delete** — permanently remove a session with a confirmation step

## UI Entry Point

A three-dot (`⋯`) menu button (`MoreVertical` icon) in the top-right corner of each `SessionCard`. Opens a small dropdown with **Edit** and **Delete** items. Closes on outside click or Escape. Implemented with a `menuRef` and a `mousedown` document listener.

`SessionCard` is a client component and holds `menuOpen`, `editOpen`, and `deleteOpen` state directly.

## Edit Session

### Dialog (`EditSessionDialog`)

Reuses the shared `<Dialog>` component. Pre-filled from the session record:

- **Task** (text input, required)
- **Description** (textarea, optional)
- **Start time** (`<input type="time">`, from `session.startedAt`)
- **End time** (`<input type="time">`, from `session.completedAt`)

The date is fixed — not editable. `durationSeconds` is recalculated server-side. Times are stored as `HH:MM` strings in local state and recombined with the session's original date on submit via `applyTimeToDate`.

### Server Action: `updateSession`

Located in `src/actions/session-actions.ts`.

```ts
updateSession(id: string, params: {
    task: string;
    description?: string;
    startedAt: Date;
    completedAt: Date;
}): Promise<ActionResult<FocusSession>>
```

- Validates task (non-empty, max length)
- Validates `completedAt > startedAt`
- Recalculates `durationSeconds = (completedAt - startedAt) / 1000`
- Ownership enforced via `userId` filter on the update query
- Revalidates `/log` on success

## Delete Session

### Dialog (`DeleteSessionDialog`)

A confirmation dialog with the message: "Delete this session? This cannot be undone."

Two buttons: **Cancel** and **Delete** (destructive style). On success the page revalidates; no manual close call needed.

### Server Action: `deleteSession`

Located in `src/actions/session-actions.ts`.

```ts
deleteSession(id: string): Promise<ActionResult>
```

- Verifies session ownership before deletion
- Deletes from `session_projects` first (FK constraint), then from `focus_sessions`
- Revalidates `/log`

## Out of Scope

- Editing focus mode (would change duration semantics)
- Editing project associations
- Bulk delete
