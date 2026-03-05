# Multi-Project Sessions and Timer Alerts

## Summary

This document describes the product and technical design for three related capabilities:

1. Tag one focus session with multiple projects
2. Play an alarm sound when a focus session ends
3. Show a native browser notification when a focus session ends

The goal is to improve session tracking flexibility and make session completion hard to miss.

## Scope

### In scope

- Multi-project tagging for a single focus session
- Timer UI updates to display multiple projects
- Stats and history updates that account for multi-project tagging
- Client-side alarm sound on completion
- Browser notification on completion

### Out of scope

- Mobile push notifications
- Background desktop service notifications
- Splitting session duration across projects

## Data Model

### `session_projects` junction table

- `session_id` (uuid, FK to `focus_sessions.id`, cascade delete)
- `project_id` (uuid, FK to `projects.id`, cascade delete)
- Composite primary key: (`session_id`, `project_id`)

### Migration strategy

1. Create `session_projects`
2. Backfill from existing `focus_sessions.project_id`
3. Drop `focus_sessions.project_id`

### Time attribution rule

Each tagged project receives full session credit.

Example: a 50-minute session tagged with projects A and B adds 50 minutes to A and 50 minutes to B.

## Domain Types

Use project arrays instead of a single project reference in timer/session types.

- `StartTimerParams.projects: ReadonlyArray<{ id; name; color }>`
- `ActiveTimer.projects: ReadonlyArray<{ id; name; color }>`
- Session display DTOs use `projects[]` instead of `projectName/projectColor`

## Backend Changes

### Session creation

- Create session row in `focus_sessions`
- Insert related rows into `session_projects`

### Session reads

- Load sessions first
- Load project links via `session_projects`
- Group projects by session for UI output

### Project-specific logs

- Query sessions by joining through `session_projects`

### Stats

- Join through `session_projects`
- Apply full-credit attribution per tagged project

## Frontend Changes

### Session setup

- Replace single project select with multi-select chips
- Keep start disabled until at least one project is selected and task is non-empty

### Timer display and active banner

- Show multiple project color dots and names
- Truncate or wrap long project lists gracefully

### Session history and project detail

- Render multiple project badges per session

## Completion Alerts

### Alarm sound (`src/lib/alarm.ts`)

- Web Audio API-generated beep pattern
- Finite duration with auto-stop
- Stop on relevant user action and break completion

### Native notification (`src/lib/notifications.ts`)

- Feature detection for `Notification`
- Permission request on timer page load (non-blocking UX)
- Notification dispatched when focus session completes

## Acceptance Criteria

- A user can start a session with one or more projects selected
- Session history shows all tagged projects
- Stats include session time for each tagged project (full-credit rule)
- Alarm plays when focus completes
- Native notification appears when permission is granted
- Existing sessions remain valid after migration

## Verification Checklist

- Migration runs successfully and backfill is correct
- Timer start/pause/resume/complete/abandon flows still work
- Project log and global log render correctly with multi-project sessions
- Stats views remain correct and stable
- Build and lint pass
