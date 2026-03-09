# Design: Session Edit & Delete

**Date:** 2026-03-09

## Overview

Three new capabilities on session cards in the daily log:
1. **Edit** — patch start/end time, task, and description after a session ended
2. **Delete** — remove a mistakenly started session

## UI Entry Point

A three-dot (`⋯`) menu button in the top-right corner of each `SessionCard`. Opens a dropdown with two items: **Edit** and **Delete**. Closes on outside click or Escape.

## Edit Session

### Dialog

Reuses the existing `<Dialog>` component. Pre-filled fields:
- **Task** (text input, required)
- **Description** (textarea, optional)
- **Start time** (`<input type="time">`, from `session.startedAt`)
- **End time** (`<input type="time">`, from `session.completedAt`)

The date is fixed (not editable). `durationSeconds` is recalculated server-side.

### Server Action: `updateSession`

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
- Revalidates `/log`

## Delete Session

### Flow

Three-dot menu → "Delete" → confirmation `<Dialog>`:
> "Delete this session? This cannot be undone."

Two buttons: **Cancel** and **Delete** (destructive style).

### Server Action: `deleteSession`

```ts
deleteSession(id: string): Promise<ActionResult>
```

- Deletes from `session_projects` first (FK constraint)
- Deletes from `focus_sessions`
- Revalidates `/log`

## Out of Scope

- Editing focus mode (would change duration semantics)
- Editing project associations
- Bulk delete
