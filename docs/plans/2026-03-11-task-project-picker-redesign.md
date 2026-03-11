# Task and Project Picker Redesign

## Problem

The current task and project selection UI uses pill-style buttons in a flex-wrap layout. With 10-30 active tasks, this becomes cluttered and hard to scan. Users struggle to find specific tasks quickly.

## Goals

- Improve visual density for task selection
- Scale gracefully to 30+ tasks/projects
- Maintain quick access for frequently used items
- Keep tasks and projects as independent entities (no schema changes)

## Design

### Hybrid Approach

Both task and project pickers use the same pattern: show recent items as quick-access pills, with a "More..." button that opens a full searchable dropdown.

### Task Picker

**Recent row:**
- Display up to 4 recent task pills (sorted by `actualPomodoros` desc, then `updatedAt` desc)
- Show "More..." button as the last item when 5+ active tasks exist
- Clicking a pill selects it; clicking again deselects
- Single-select behavior

**Full task combobox (via "More..."):**
- Dropdown anchored below the recent tasks row
- Search input at top, auto-focused on open
- Scrollable list (max-height ~240px, ~6 visible items)
- Shows all active tasks including those in recent row
- Each row: task title (left), optional metadata (right) - pomodoro progress "2/4" or due date
- Arrow keys navigate, Enter selects
- Clicking a row selects and closes dropdown
- Escape or click-outside closes without changing selection

**Selection state:**
- Selected task's pill shows accent highlight
- If selected task is not in recent row, it replaces the 4th pill slot so selection is always visible
- Example: Recent [A] [B] [C] [D], user selects G via dropdown -> [A] [B] [C] [G]

### Project Picker

**Recent row:**
- Display up to 4 recent project pills (sorted by most recently used in sessions)
- Show "More..." button when 5+ projects exist
- Pills are toggleable (multi-select)
- Each pill shows color dot and name

**Full project dropdown (via "More..."):**
- Search input at top, auto-focused
- Scrollable list with checkboxes (multi-select)
- Each row: checkbox, project name, color dot
- Clicking a row toggles selection, does NOT close dropdown
- Click-outside or Escape to close
- Selected projects via dropdown get added to visible pill row

**Selection display:**
- All selected projects show with accent border + X icon to remove
- Projects selected via "More..." appear in the pill row

### Interaction Details

**Quick task input (unchanged):**
- Remains below task picker
- If task selected AND quick task has text: selected task takes priority
- Confirmation text shows which will be used

**Keyboard navigation (combobox):**
- Tab to reach the picker
- Enter or Space to open dropdown
- Arrow Up/Down to navigate list
- Enter to select (tasks) or toggle (projects)
- Escape to close

**Empty states:**
- No tasks: "No active tasks yet. Pick one later, or use a quick task to start now."
- Search no results: "No tasks matching '[query]'"

## Out of Scope

- Task-project relationships (kept independent, linked only at session level)
- Changes to quick task input, description textarea, or focus mode selector
- Schema changes

## Components Affected

- `src/components/timer/task-picker.tsx` - major rewrite
- `src/components/timer/session-setup.tsx` - update project picker section
- New: shared combobox/dropdown component (or use existing UI primitives)
