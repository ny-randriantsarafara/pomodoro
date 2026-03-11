# Pomodoro Product Architecture

## Product Statement

Pomodoro is a task-first focus timer optimized for low-friction session start, reliable timer recovery, and practical daily progress tracking.

The current product serves two usage modes:

- **Guest mode** for local, no-account timer usage.
- **Signed-in mode** for account-backed tasks, stats, settings, and cross-device active-session sync.

## Goals

- Start focus sessions in seconds.
- Keep timer state correct across refreshes and tab/app switching.
- Support useful local-only usage without sign-up.
- Provide robust signed-in sync without realtime infra complexity.
- Keep analytics helpful, not noisy.

## Current Scope

### Implemented

- Focus presets (short / average / deep) with pause, resume, and stop.
- Task-backed sessions with optional project association.
- Signed-in active-session sync with optimistic version checks.
- Guest timer flow at `/guest/timer`.
- Task-aware log and stats pages.
- Timer and daily-goal settings.
- Browser notification support.

### Deferred

- Full guest access beyond timer-only flow.
- Guest-to-account import execution.
- Realtime transport (SSE/WebSocket) for active session updates.
- Desktop/mobile shells and distraction tooling.
- Export and routines/reminders.

## Domain Model

- `tasks`: planning and ownership unit.
- `sessions`: immutable historical records for reporting.
- `active_sessions`: live signed-in timer state.
- `user_settings`: timer and daily-goal preferences.
- guest workspace storage: local-only tasks/sessions/settings/timer state.

Historical and live state are intentionally separated to keep sync and analytics predictable.

## UX Model

### Entry Points

- Public: `/`, `/guest/timer`
- Authenticated: `/timer`, `/tasks`, `/log`, `/stats`, `/settings`

### Guest Mode Contract

- Local browser storage only.
- No cross-device sync.
- Data remains isolated from authenticated timer restoration.

### Signed-In Mode Contract

- Server is source of truth for live timer state.
- Polling + optimistic updates + version checks drive reconciliation.
- Conflicts resolve by reloading server state instead of silent overwrite.

## Constraints

- Polling-based sync favors simplicity over instant realtime behavior.
- Guest flow remains intentionally narrower than authenticated flow.
- Some roadmap capabilities are postponed to keep core timer reliability first.

## Related Docs

- `../README.md` for documentation map.
- `../features/session-workflow.md` for session CRUD behavior.
- `../features/pip-timer.md` for PiP behavior.
- `../implementation/ci-vps-migration-runbook.md` for deployment migration safety.
