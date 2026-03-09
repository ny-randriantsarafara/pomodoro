# Feature: Manual Session Entry

**Date:** 2026-03-09

## Overview

Users can log a focus session from the daily log page for work completed without starting the timer (e.g., a forgotten session).

## UI Entry Point

An "Add session" button in the log page header, next to the date picker. Implemented as a `LogHeader` client component that wraps both the `DatePicker` and the dialog trigger, since the log page is a server component and cannot hold dialog state directly.

## Dialog Fields (`AddSessionDialog`)

- **Task** (text input, required)
- **Focus mode** select — short / average / deep — determines session duration
- **Projects** multi-select (optional) — pill buttons, one per user project
- **Description** textarea (optional)

On submit, calls `addManualSession`, then closes the dialog. The page revalidates automatically.

## Server Action: `addManualSession`

Located in `src/actions/session-actions.ts`.

**Input:**
- `task` (string, required)
- `focusMode` (FocusMode)
- `projectIds` (string[])
- `description` (string, optional)
- `date` (Date — the log page's selected date)

**Behaviour:**
- `startedAt`: selected date at current time (seconds zeroed)
- `completedAt`: `startedAt + durationSeconds`
- `durationSeconds`: derived from `FOCUS_MODES[focusMode].workMinutes * 60`
- `status`: always `'completed'`
- Revalidates `/log` on success
