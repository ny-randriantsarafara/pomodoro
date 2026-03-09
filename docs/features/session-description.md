# Feature: Session Description

**Date:** 2026-03-09

## Overview

An optional free-text description field on focus sessions, allowing users to add extra context beyond the task name.

## Database

A nullable `description` column on the `focus_sessions` table:

```sql
ALTER TABLE "focus_sessions" ADD COLUMN "description" text;
```

Migration: `drizzle/0003_add_session_description.sql`

The `SessionWithProjects` type includes `readonly description: string | null`.

## Where It Appears

### Timer start form (`SessionSetup`)

An optional textarea labeled "Description (optional)" below the task input. Passed to the `startSession` server action as an optional parameter and persisted to `focusSessions.description`.

### Session card (`SessionCard`)

If `description` is non-empty, it is rendered below the task title in smaller secondary-color text (`text-xs text-[var(--text-secondary)]`).

### Manual session form (`AddSessionDialog`)

The same optional description textarea is present in the manual session entry dialog.

## Out of Scope

- Editing description after session creation (covered by session edit feature)
- Description length validation
- Truncation/expand UI for long descriptions
