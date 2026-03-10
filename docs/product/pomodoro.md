# Pomodoro Product And Architecture

## Overview

Pomodoro is a task-first focus timer built around low-friction session start, reliable timer recovery, and lightweight progress tracking. The current web product supports both local guest usage and authenticated sync, with signed-in active sessions visible across devices.

The product has evolved from a project-centric timer into a broader focus workflow:

- tasks are first-class
- project association is optional
- guest mode works locally without an account
- signed-in users can restore and control the same active session from another browser

## Product Goals

- start a focus session in seconds
- keep timer state reliable across refreshes and backgrounding
- support local-only use without sign-up
- support signed-in sync for tasks, settings, history, and active session state
- show useful daily and historical progress without overwhelming the user

## Scope

### Shipped

- focus sessions with short, average, and deep presets
- pause, resume, and stop controls
- task creation and task-backed sessions
- optional project association for tasks and sessions
- signed-in active session sync with shared live state
- guest mode with a public landing page and local-only timer flow
- task-aware log and stats views
- timer and daily-goal settings
- browser notifications and recovery-oriented persistence

### Not Yet Shipped

- full guest-mode access to tasks, log, and stats
- guest-to-account import execution
- push-based active-session transport such as SSE or WebSockets
- native desktop and mobile shells
- OS-level distraction blocking
- distraction inbox, routines, and export flows

## Core Domains

### Tasks

Tasks are the main planning unit. A user can create tasks, start focus sessions against them, and review focus output by task over time.

Key attributes:

- title
- optional note
- status
- due date
- estimated Pomodoros
- completed Pomodoros

### Sessions

Sessions are historical records. They capture what happened for reporting, logs, and analytics. They are distinct from live timer state.

### Active Session

Active session state is the live timer model for signed-in users. It is server-owned and shared across devices using optimistic version checks and timestamp-based reconstruction.

### Projects

Projects remain available, especially for GitHub-backed organization, but they are no longer required to start a session.

## User Experience Model

### Entry Points

- `/` is the public landing page
- `/guest/timer` is the local-only guest timer
- `/timer`, `/tasks`, `/log`, `/stats`, and `/settings` are authenticated routes

### Guest Mode

Guest mode is intentionally narrow in the current web product:

- a signed-out user can start a local timer immediately
- guest data stays in browser storage
- guest state does not sync across devices
- sign-in can surface an upgrade banner when guest data exists locally

### Signed-In Mode

Signed-in mode is the full product path:

- tasks, settings, history, and stats are account-backed
- the active session is shared across signed-in browsers
- server state is the source of truth for live timer control

## Timer And Sync Model

### Timer Accuracy

Timer state is derived from persisted timestamps and pause metadata rather than visual tick counts. This allows recovery after refresh, backgrounding, or another device opening the same session.

### Signed-In Sync

Signed-in active sessions are stored on the server and reconciled through:

- polling-based refresh
- optimistic updates
- version checks on mutations

If two devices race, the losing client reloads current server state instead of silently overwriting it.

### Guest Persistence

Guest timers are stored locally and intentionally isolated from the signed-in timer flow. A guest timer should never be restored into the authenticated `/timer` route.

## Data Model Direction

The current product direction separates historical and live state:

- `tasks` for planning and ownership
- `sessions` for historical records
- `active_sessions` for signed-in live timer state
- `user_settings` for timer and goal preferences
- guest workspace storage for local-only tasks, sessions, settings, and active timer state

This split is what enables cross-device visibility without overloading historical session records with live state concerns.

## Settings

The settings model now includes:

- work duration
- short break duration
- long break duration
- long-break frequency
- daily goal minutes
- analytics opt-in

This is the beginning of the broader settings surface described in the original spec.

## Risks And Constraints

- guest mode is still timer-only and does not expose the full app shell
- guest import is surfaced but not executed yet
- polling is sufficient for correctness but not instant in the same way push transport would be
- several later-spec items remain intentionally deferred to keep the web core focused

## Recommended Next Steps

- implement guest import into authenticated accounts
- expand guest mode beyond the timer when product priority justifies it
- add distraction inbox and routine support
- evaluate push-based session updates if polling latency becomes a UX issue
