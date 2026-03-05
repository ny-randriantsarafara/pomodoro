# Multi-Project Sessions + Timer Notifications

## Overview

Three enhancements to the Pomodoro app:

1. Allow tagging a single focus session with multiple projects
2. Play an alarm sound when the timer completes
3. Send a native OS notification when the timer completes

## Data Model

### New table: `session_projects`

| Column     | Type | Constraints                                  |
| ---------- | ---- | -------------------------------------------- |
| session_id | uuid | FK → focus_sessions.id, ON DELETE CASCADE    |
| project_id | uuid | FK → projects.id, ON DELETE CASCADE          |

Composite PK on `(session_id, project_id)`.

### Migration

1. Create `session_projects` table
2. Copy existing `focus_sessions.project_id` rows into `session_projects`
3. Drop `project_id` column from `focus_sessions`

### Time attribution

Each tagged project receives 100% of the session's focus time. A 50-minute session tagged with projects A and B credits 50 minutes to both A and B in stats and leaderboard.

## Type Changes

### `ActiveTimer`

Replace single-project fields with:

- `projectIds: ReadonlyArray<string>`
- `projects: ReadonlyArray<{ id: string; name: string; color: string }>`

Remove: `projectId`, `projectName`, `projectColor`.

### `StartTimerParams`

Same change — array of project references instead of single.

### `SessionWithProject` → `SessionWithProjects`

- `projects: ReadonlyArray<{ id: string; name: string; color: string }>`

Remove: `projectId`, `projectName`, `projectColor`.

## UI: Multi-Project Selection

### Session setup (`session-setup.tsx`)

Replace the `<Select>` dropdown with a chip-based multi-select:

- List of projects with colored dots; clicking toggles selection
- Selected projects shown as removable chips
- At least 1 project required to enable Start

### Timer display

Show multiple project color dots and names inline or stacked.

### Active session banner

Show multiple project names, truncated if too many.

### Log and stats

Session cards display multiple project badges. Stats give full time credit to each tagged project.

## Timer Completion: Alarm Sound

### `src/lib/alarm.ts`

Generate an alarm tone using the Web Audio API:

- Repeating beep pattern: 3 beeps at 440 Hz, 200 ms each, 150 ms gaps
- Expose `playAlarm()` and `stopAlarm()`
- Auto-stop after ~5 seconds

No external audio files needed.

## Timer Completion: Native Notification

### `src/lib/notifications.ts`

- `requestNotificationPermission()` — called on timer page load
- `sendTimerCompleteNotification(task: string)` — fires `new Notification(...)`

Permission requested via a subtle prompt on the timer page, not a blocking modal.

## Integration

In `use-timer.ts`, inside `completeFocusAndStartBreak`:

1. Call `playAlarm()`
2. Call `sendTimerCompleteNotification(timer.task)`
3. Stop alarm on user interaction or when break ends

## Files to Create/Modify

| File                                        | Action |
| ------------------------------------------- | ------ |
| `src/lib/db/schema.ts`                      | Modify |
| `drizzle/migration`                         | Create |
| `src/types/index.ts`                        | Modify |
| `src/actions/session-actions.ts`            | Modify |
| `src/actions/stats-actions.ts`              | Modify |
| `src/hooks/use-timer.ts`                    | Modify |
| `src/hooks/use-timer-persistence.ts`        | Modify |
| `src/lib/alarm.ts`                          | Create |
| `src/lib/notifications.ts`                  | Create |
| `src/components/timer/session-setup.tsx`     | Modify |
| `src/components/timer/timer-display.tsx`     | Modify |
| `src/components/timer/active-session-banner.tsx` | Modify |
| `src/components/session/session-card.tsx`    | Modify |
| `src/components/stats/*`                    | Modify |
| `src/app/(app)/timer/timer-view.tsx`        | Modify |
| `src/app/(app)/projects/[id]/page.tsx`      | Modify |
