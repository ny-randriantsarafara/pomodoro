# Timer Bug Fix, Task Selection Rework, and Description Rendering

Date: 2026-03-11

## 1. Bug Fix: Timer immediately goes to break on start

### Root cause

In `src/hooks/timer-state.ts:87`, `buildTimerStateFromSyncedSession()` checks:

```typescript
if (session.phase === 'focus' && session.sessionId) {
```

When a signed-in user starts a session, the flow is:

1. `startSession()` creates a `focusSession` record
2. `createActiveSession()` creates the `activeSession` record
3. The 2-second sync poll fires `getActiveSession()` which calls `getActiveSessionMetadata()` to find the matching `focusSession`

There is a race condition: the sync poll can resolve before the metadata lookup finds the `focusSession`. When `sessionId` is `null`, the condition fails and execution falls through to the break branch at line 113, immediately setting `phase: 'break'`.

### Fix

Change `buildTimerStateFromSyncedSession()` to check `session.phase === 'focus'` without requiring `sessionId` to be truthy. When phase is `'focus'` but `sessionId` is null, build a focus timer state from the phase timing data (phaseStartedAt, phaseDurationSeconds, etc.) instead of falling through to the break branch.

Split the logic so the phase determines the branch, and sessionId presence is handled within each branch:

- `phase === 'focus'` with `sessionId`: build ActiveTimer as before
- `phase === 'focus'` without `sessionId`: build focus state from phase timing (no ActiveTimer, but phase is 'focus' and remaining seconds are computed correctly)
- `phase === 'shortBreak' | 'longBreak'`: existing break handling

### Files to change

- `src/hooks/timer-state.ts` — `buildTimerStateFromSyncedSession()`

## 2. Task Selection UI Rework

### Current state

`TaskPicker` (`src/components/timer/task-picker.tsx`) renders a flat list of pill buttons with no search, no ordering. Works for a few tasks but becomes unusable at 10+.

### Changes

Add search filtering to `TaskPicker`, following the same pattern already used for projects in `session-setup.tsx`:

1. Add a search input that appears when there are more than 5 active tasks
2. Filter tasks by title matching the search query (case-insensitive substring match)
3. Sort tasks by most recently used first (`actualPomodoros` desc, then `updatedAt` desc)
4. Keep the selected task always visible even when it doesn't match the filter
5. Show "No tasks matching..." empty state when filter yields no results

### Files to change

- `src/components/timer/task-picker.tsx` — add search input, filtering, and sorting logic

## 3. Task Description Rendering

### Current state

`task-card.tsx:86` and `session-card.tsx:149` render descriptions with plain `<p>` tags. Line breaks and structure typed by users is lost.

### Fix

Add `whitespace-pre-wrap` CSS class to description/note paragraphs. This preserves line breaks and indentation while still wrapping long lines normally.

### Files to change

- `src/components/task/task-card.tsx` line 86 — add `whitespace-pre-wrap` to task note
- `src/components/session/session-card.tsx` line 149 — add `whitespace-pre-wrap` to session description
