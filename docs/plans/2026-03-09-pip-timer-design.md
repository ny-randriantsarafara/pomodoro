# Design: Picture-in-Picture Timer

**Date:** 2026-03-09

## Overview

Allow the timer to float in a Picture-in-Picture window (like Google Meet) so the user can see the countdown and control the session while on another tab.

Uses the **Document Picture-in-Picture API** (Chrome/Edge 116+). Gracefully hidden on unsupported browsers.

## Architecture

### `usePiP` hook — `src/hooks/use-pip.ts`

Wraps the Document PiP API:
- `isSupported` — `typeof window.documentPictureInPicture !== 'undefined'`
- `pipWindow: Window | null` — the active PiP window
- `openPiP()` — calls `requestWindow({ width: 280, height: 200 })`, copies styles into the PiP document
- `closePiP()` — closes PiP window if open
- Listens to `pagehide` on the PiP window to sync state when user closes it manually

### CSS propagation

On `openPiP()`, copy all `<style>` and `<link rel="stylesheet">` elements from `document.head` into `pipWindow.document.head`. This makes Tailwind classes and CSS custom properties (design tokens) work inside the PiP window.

### `PipTimer` component — `src/components/timer/pip-timer.tsx`

Rendered via a React portal into `pipWindow.document.body`. Props:
- `remainingSeconds`, `phase`, `activeTimer`
- `isPaused`, `onPause`, `onResume`, `onAbandon`

Shows: countdown, task name, Pause/Resume button, Abandon button. Dark background (`#0A0A0B`) matching the app.

### PiP trigger button

Added to `src/app/(app)/timer/timer-view.tsx`, visible only when:
- `phase === 'focus'`
- `isSupported === true`

Uses `PictureInPicture` icon from lucide-react. Toggles PiP open/closed.

## Out of Scope

- Safari / Firefox support
- Break timer in PiP (focus sessions only)
- Custom PiP window size controls
