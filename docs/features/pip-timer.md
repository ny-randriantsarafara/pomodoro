# Feature: Picture-in-Picture Timer

**Date:** 2026-03-09

## Purpose

Allow an active focus timer to stay visible and controllable in a floating window while the user works in other tabs.

## User Contract

- Feature appears only when browser supports Document Picture-in-Picture.
- Toggle is shown only during focus phase.
- PiP closes automatically when focus phase ends.

## Implementation

### Hook: `src/hooks/use-pip.ts`

`usePiP` wraps the Document PiP API and exposes:

- `isSupported`
- `pipWindow`
- `openPiP()`
- `closePiP()`

When opening PiP, stylesheets from the main document are copied into the PiP window so existing Tailwind classes and CSS variables render correctly.

### PiP UI: `src/components/timer/pip-timer.tsx`

Rendered via portal into `pipWindow.document.body`.

Displays:

- remaining time,
- task label,
- pause/resume control,
- abandon control.

### Timer Integration: `src/app/(app)/timer/timer-view.tsx`

Owns the toggle action and phase-based lifecycle:

- open/close button is gated by support + focus phase,
- leaving focus triggers `closePiP()` cleanup.

## Browser Support

- Supported: Chromium browsers with Document PiP (Chrome/Edge 116+).
- Unsupported browsers: feature is hidden (graceful degradation).

## Non-Goals

- Safari/Firefox fallback implementation.
- Break-phase PiP rendering.
- User-configurable PiP window size.
