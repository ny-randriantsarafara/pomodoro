# Pomodoro App V1 Evolution Design

**Date:** 2026-03-10

**Status:** Approved

**Authoring context:** This document captures the approved design direction for evolving the existing Pomodoro application from a project-centric timer into a broader, lower-friction productivity product with guest mode, first-class tasks, configurable timer behavior, and shared active-session control across signed-in devices.

---

## 1. Executive Summary

The current application already provides a strong foundation: authenticated users, project-backed focus sessions, daily logs, statistics, browser notifications, and Picture-in-Picture support. The product is functional, but its workflow is narrower than the intended Pomodoro specification.

The approved direction is to evolve the existing Next.js application incrementally rather than rewrite it. The app should become a sync-first web core that:

- lets a user start a session quickly, with or without a task
- supports guest mode with local-only persistence
- supports signed-in mode with cloud sync
- treats tasks as first-class entities
- keeps projects as optional organization rather than a required prerequisite
- moves the active timer from local-only state to a server-owned shared session model
- allows a running session started on one signed-in device to be viewed and controlled from another signed-in device

This direction preserves existing working product surfaces while expanding the app toward the full V1 scope described in the specification.

---

## 2. Current Product Baseline

The repository already includes the following working capabilities:

- authenticated multi-user access with Auth.js
- project management and GitHub repository import
- focus sessions with three built-in focus modes
- local timer persistence across refreshes and tab closes
- daily log and manual session entry
- session editing and deletion
- statistics and streak tracking
- browser notifications on session completion
- Picture-in-Picture timer support

The main limitations relative to the target product are:

- active timer state is stored only in client local storage
- another device cannot see or control the current session
- projects are effectively required to start work
- tasks are not modeled as first-class records
- timer customization is limited to fixed focus presets
- there is no guest mode
- settings are minimal
- break logic is simplified and not user-configurable
- distraction inbox, daily goals, routines, and export are not implemented

---

## 3. Product Direction

### 3.1 Product Goal

Deliver a cleaner and lower-friction Pomodoro product that works for both personal and account-backed use, while preserving the app's existing strengths in timer reliability and historical reporting.

### 3.2 Product Positioning

The app should remain intentionally lightweight. It is not meant to become a full work management suite, a social productivity platform, or a deeply integrated enterprise tool. Its primary value is fast session start, reliable tracking, calm focus UX, and practical progress review.

### 3.3 Approved Strategic Approach

The approved approach is:

- evolve the existing Next.js monolith
- preserve existing working routes and components where possible
- introduce new domain entities incrementally
- move signed-in live session ownership to the server
- keep guest mode fully local
- begin cross-device sync with a polling-based model, leaving realtime transport as a later optimization

This approach was selected because it delivers the missing product scope with the least rewrite risk and makes best use of the current repository.

---

## 4. V1 Scope

### 4.1 In Scope

- focus sessions, short breaks, and long breaks
- pause, resume, stop, skip, and restart controls
- configurable work and break durations
- configurable long-break frequency
- optional auto-start of breaks and focus sessions
- guest mode with local persistence
- account mode with synced tasks, history, preferences, and active session state
- first-class tasks with task-to-session association
- optional project association for tasks and sessions
- cross-device viewing and shared control of the active session for signed-in users
- history, daily dashboard, trends, streaks, and task-oriented analytics
- distraction inbox
- daily goals
- timer notifications and lightweight focus mode behavior

### 4.2 Explicitly Out of Scope for This Iteration

- native desktop and mobile shells
- hard OS-level app blocking
- browser extension or host-level website blocking
- advanced team collaboration
- heavy gamification
- AI-dependent coaching
- enterprise administration
- deep per-platform operating system integrations

---

## 5. Domain Model

The product should be centered around four primary domains:

### 5.1 Tasks

Tasks become the main planning and execution unit. A user should be able to start a session against a task, create a task inline from the timer screen, or start without a task if preferred.

Task attributes should include:

- title
- optional note
- status
- due date
- optional estimate in Pomodoros
- completed Pomodoro count
- optional tags

### 5.2 Sessions

Sessions represent historical records of work and break activity. They are the foundation for reporting, logs, and analytics. Session records should preserve timing integrity and support metadata editing without corrupting duration semantics.

### 5.3 Active Session State

Active session state is distinct from historical session records. It must represent the current live timer state for signed-in users and be shareable across devices. This is the key architectural shift required for cross-device visibility and control.

### 5.4 Projects

Projects remain supported, especially because the current product already uses them extensively and integrates with GitHub repositories. However, projects should become optional organizational metadata rather than a mandatory prerequisite for starting focus work.

---

## 6. User Experience Model

### 6.1 Navigation

The product should move toward the following primary navigation:

- Timer
- Tasks
- History
- Stats
- Settings

Projects may remain available, but as a secondary organizational surface rather than the primary entry point for work.

### 6.2 Timer Screen

The timer screen should become the fastest path to action.

Expected behavior:

- user can start immediately
- user can choose a task, create a quick task inline, or leave the session unassigned
- project association is optional
- timer preset and custom duration behavior is controlled by user settings
- active signed-in sessions render consistently across devices
- remote updates from another device appear automatically with clear but unobtrusive feedback

### 6.3 Tasks Screen

Tasks should become the main work planning surface. The initial design should emphasize a today-oriented workflow with quick actions such as start, complete, edit, and archive.

### 6.4 History And Stats

The app already has a strong log and stats foundation. These surfaces should be extended to become more task-oriented, while retaining project breakdowns as optional secondary analytics.

### 6.5 Guest Mode UX

Guest mode should be available immediately on first use. The UI must make it clear that guest data is stored locally and does not sync across devices. When the user signs in, the app should offer import of local guest data into the account.

---

## 7. Data Model Evolution

### 7.1 Existing Constraint

The current schema stores historical focus sessions and relies on local browser storage for the live timer. That design cannot support shared control from multiple devices.

### 7.2 Target Schema Direction

The existing `focus_sessions` responsibility should be split conceptually into:

- historical `sessions`
- live `active_sessions`

Proposed core entities:

- `tasks`
- `projects`
- `task_projects`
- `sessions`
- `session_projects`
- `active_sessions`
- `user_settings`
- `distraction_inbox_items`
- `daily_goals`
- `devices`

### 7.3 Active Session Record

For signed-in users, `active_sessions` should hold the source of truth for:

- current phase
- phase start timestamp
- phase duration
- pause state
- accumulated paused time
- completed focus count within the cycle
- long-break cycle position
- owning user
- originating device
- last modifying device
- optimistic concurrency version

### 7.4 Guest Storage

Guest mode should remain entirely local. It should store:

- tasks
- sessions
- settings
- local active session state

IndexedDB is the preferred primary store, with local storage allowed for lightweight compatibility and recovery helpers.

### 7.5 Migration Principle

Migrations should be additive first. Existing users and historical data must remain valid while new tables and flows are introduced. The UI should shift gradually from project-first behavior to task-first behavior.

---

## 8. Cross-Device Session Sync

### 8.1 Functional Requirement

When a signed-in user starts a session on device A, device B must be able to:

- see the active session
- see the current phase and remaining time
- pause it
- resume it
- skip to the next phase
- stop or abandon it

### 8.2 Source Of Truth

For signed-in users, the server owns active session state. Clients may render optimistically, but they must reconcile against server state.

### 8.3 Time Calculation

All clients must compute remaining time from persisted timestamps and pause metadata rather than counting local ticks. This preserves correctness during refresh, backgrounding, suspension, and multi-device viewing.

### 8.4 Sync Transport

Initial transport should use short-interval polling. This is simpler to implement in the existing codebase and is sufficient for correctness. A push-based transport such as Server-Sent Events or WebSockets can be added later if the product requires lower-latency UI updates.

### 8.5 Concurrency Control

Every active session update should check a `version` field. If two devices attempt conflicting changes, one update should win and the losing client should reload the latest state and surface a small conflict notice.

---

## 9. Timer Behavior

### 9.1 Supported Modes

The target timer behavior for V1 includes:

- focus
- short break
- long break
- optional manual countdown if kept in scope after task breakdown

Stopwatch mode can remain deferred.

### 9.2 Configurability

User settings should support:

- work duration
- short break duration
- long break duration
- long-break frequency
- auto-start next break
- auto-start next focus session
- auto-loop cycle
- sound and notification preferences

### 9.3 Session Completion Semantics

The domain must distinguish:

- completed session
- interrupted session
- abandoned session
- partial session if later supported in the product logic

The current behavior, which creates a session row in a completed state at session start, should be corrected as part of the migration.

---

## 10. Focus Support Features

### 10.1 Lightweight Focus Mode

V1 should include a focus-oriented presentation mode rather than deep operating system control. The app should reduce in-app distractions, make the timer visually dominant, and keep transitions clear.

### 10.2 Distraction Inbox

Users should be able to capture a thought during a running session without ending the timer. These entries should be stored and reviewable later.

### 10.3 Notification Guidance

The app should continue to support browser notifications and provide settings around them. Hard platform-specific focus integrations should remain a future extension point rather than a V1 requirement for the web application.

---

## 11. Settings

Settings must expand materially beyond the current GitHub connection screen.

The app should support at least:

- timer durations
- long-break frequency
- auto-start settings
- sound settings
- notification settings
- theme
- streak visibility
- daily goal
- week start day
- analytics/privacy options

GitHub connections and authentication settings should remain, but they should no longer define the primary purpose of the settings page.

---

## 12. Error Handling And Recovery

### 12.1 Timer Recovery

On load, the app should check:

- local guest active session state for guest users
- server active session state for signed-in users

The UI should not render an idle timer if a recoverable active session exists.

### 12.2 Offline Behavior

Guest mode should remain fully functional offline.

Signed-in mode should support safe viewing of locally known state, but control actions should reconcile against connectivity status. If the network is unavailable, the UI should guide the user clearly instead of pretending shared control succeeded.

### 12.3 Merge On Sign-In

When a guest user signs in, the app should offer import of local tasks, sessions, and settings. If the account already has a server-owned active session, that active session should take precedence over any guest-side local active state.

---

## 13. Incremental Delivery Strategy

The recommended implementation order is:

1. add schema for tasks, settings, and active sessions
2. refactor signed-in live timer ownership to server state
3. preserve guest mode as local-only state
4. introduce task-first UI with optional projects
5. expand settings
6. update history and stats
7. add guest import flow
8. optimize sync transport later if needed

This order minimizes user-facing regression risk while unlocking the most important product capabilities early.

---

## 14. Testing Strategy

The implementation should be validated with:

- unit tests for timer state derivation and cycle logic
- tests for pause/resume timestamp math
- tests for active-session conflict handling
- migration tests for existing users, projects, and history
- integration tests for guest mode persistence and recovery
- integration tests for signed-in cross-device session visibility and shared control
- regression tests for manual session entry, stats, and log filtering

Manual verification should cover:

- tab refresh
- background tab suspension
- multi-tab behavior
- logout and re-login
- concurrent controls from different browsers

---

## 15. Risks And Watchpoints

Key risks in the current codebase include:

- live timer ownership is currently client-only
- the session lifecycle model is too coarse for shared control
- project-first UX adds unnecessary friction
- settings infrastructure is minimal today

These are manageable if the implementation stays incremental and keeps the active session state machine separate from historical records.

---

## 16. Final Recommendation

Proceed by evolving the existing application into a sync-first web core. Keep the current repository structure, preserve the strongest existing surfaces, and add the missing product capabilities through additive schema changes, task-first UX, and a server-owned active session model for signed-in users.

This path gives the product the missing features from the specification, including guest mode and cross-device active-session visibility and control, without paying the cost of a rewrite.
