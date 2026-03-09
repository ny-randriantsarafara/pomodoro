# Feature: Picture-in-Picture Timer

**Date:** 2026-03-09

## Overview

The active focus timer can be floated in a Picture-in-Picture window (similar to Google Meet), letting users see the countdown and control their session while on another tab.

## Browser Support

Uses the **Document Picture-in-Picture API** — supported in Chrome and Edge 116+. The feature is entirely hidden on unsupported browsers (graceful degradation via `isSupported` check).

## Architecture

### `usePiP` hook — `src/hooks/use-pip.ts`

Wraps the Document PiP API and exposes:

- `isSupported` — `typeof window.documentPictureInPicture !== 'undefined'`
- `pipWindow: Window | null` — the active PiP window reference
- `openPiP()` — calls `requestWindow({ width: 280, height: 220 })`, then copies all `<style>` and `<link rel="stylesheet">` elements from `document.head` into `pipWindow.document.head` so Tailwind classes and CSS custom properties (design tokens) work inside the PiP window
- `closePiP()` — closes the PiP window if open

The hook listens to `pagehide` on the PiP window to sync React state when the user closes the window manually. It also closes the PiP window on main-page unmount via a `useEffect` cleanup.

### `PipTimer` component — `src/components/timer/pip-timer.tsx`

Rendered via `createPortal` into `pipWindow.document.body`. Displays:

- Countdown in monospace font
- Task name (truncated)
- Pause/Resume button (accent colour)
- Abandon button (danger colour)

Background is `#0A0A0B` to match the app's dark theme.

Props: `pipWindow`, `remainingSeconds`, `activeTimer`, `onPause`, `onResume`, `onAbandon`.

### PiP toggle button — `src/app/(app)/timer/timer-view.tsx`

A "Pop out timer" / "Close PiP" text button using the `PictureInPicture2` icon from lucide-react. Rendered only when:

- `phase === 'focus'`
- `isSupported === true`

`TimerView` also contains a `useEffect` that calls `closePiP()` whenever `phase` leaves `'focus'`, ensuring the PiP window closes automatically when a session ends or is abandoned.

## Out of Scope

- Safari / Firefox support
- Break timer in PiP (focus sessions only)
- Custom PiP window size controls
