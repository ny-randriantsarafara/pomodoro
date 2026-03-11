# Task and Project Picker Redesign - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace pill-grid task/project pickers with hybrid UI: 4 recent pills + searchable dropdown for full list.

**Architecture:** Build a reusable Combobox component for the dropdown, then refactor TaskPicker to use hybrid pattern, then apply same pattern to project picker in SessionSetup.

**Tech Stack:** React, TypeScript, Vitest, Testing Library. No external dropdown library - build with native DOM + portal.

---

## Task 1: Create Combobox Base Component

**Files:**
- Create: `src/components/ui/combobox.tsx`
- Create: `src/components/ui/combobox.test.tsx`

### Step 1: Write failing test for basic open/close

```typescript
// src/components/ui/combobox.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Combobox } from './combobox';

const items = [
    { id: '1', label: 'Item One' },
    { id: '2', label: 'Item Two' },
    { id: '3', label: 'Item Three' },
];

describe('Combobox', () => {
    it('opens dropdown when trigger is clicked', async () => {
        const user = userEvent.setup();
        render(
            <Combobox
                items={items}
                value={null}
                onChange={() => {}}
                renderTrigger={({ open }) => (
                    <button data-testid="trigger">
                        {open ? 'Close' : 'Open'}
                    </button>
                )}
                renderItem={({ item }) => <span>{item.label}</span>}
            />
        );

        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        await user.click(screen.getByTestId('trigger'));
        expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
        const user = userEvent.setup();
        render(
            <div>
                <button data-testid="outside">Outside</button>
                <Combobox
                    items={items}
                    value={null}
                    onChange={() => {}}
                    renderTrigger={() => <button data-testid="trigger">Open</button>}
                    renderItem={({ item }) => <span>{item.label}</span>}
                />
            </div>
        );

        await user.click(screen.getByTestId('trigger'));
        expect(screen.getByRole('listbox')).toBeInTheDocument();
        await user.click(screen.getByTestId('outside'));
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('closes dropdown when Escape is pressed', async () => {
        const user = userEvent.setup();
        render(
            <Combobox
                items={items}
                value={null}
                onChange={() => {}}
                renderTrigger={() => <button data-testid="trigger">Open</button>}
                renderItem={({ item }) => <span>{item.label}</span>}
            />
        );

        await user.click(screen.getByTestId('trigger'));
        expect(screen.getByRole('listbox')).toBeInTheDocument();
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
});
```

### Step 2: Run test to verify it fails

Run: `npm run test:run -- src/components/ui/combobox.test.tsx`
Expected: FAIL - module not found

### Step 3: Write minimal Combobox implementation

Create `src/components/ui/combobox.tsx` with:
- useState for open, search, highlightedIndex
- Portal-based dropdown positioned below trigger
- Search input with filtering
- Keyboard navigation (ArrowUp/Down, Enter, Escape)
- Click-outside to close

Key props:
- `items: ReadonlyArray<{ id: string; label: string }>`
- `value: string | null`
- `onChange: (item) => void`
- `renderTrigger: ({ open, toggle }) => ReactNode`
- `renderItem: ({ item, isSelected, isHighlighted }) => ReactNode`
- `closeOnSelect?: boolean` (default true)
- `searchPlaceholder?: string`
- `emptyMessage?: string`

### Step 4: Run test to verify it passes

Run: `npm run test:run -- src/components/ui/combobox.test.tsx`
Expected: PASS (3 tests)

### Step 5: Commit

```bash
git add src/components/ui/combobox.tsx src/components/ui/combobox.test.tsx
git commit -m "feat(ui): add Combobox component with search and keyboard navigation"
```

---

## Task 2: Add Keyboard Navigation Tests to Combobox

**Files:**
- Modify: `src/components/ui/combobox.test.tsx`

### Step 1: Add tests for arrow navigation, Enter selection, search filtering

### Step 2: Run tests to verify they pass

Run: `npm run test:run -- src/components/ui/combobox.test.tsx`
Expected: PASS (6 tests)

### Step 3: Commit

```bash
git add src/components/ui/combobox.test.tsx
git commit -m "test(ui): add keyboard navigation and search filter tests for Combobox"
```

---

## Task 3: Refactor TaskPicker to Hybrid Layout

**Files:**
- Modify: `src/components/timer/task-picker.tsx`
- Modify: `src/components/timer/task-picker.test.ts`

### Step 1: Add test for getVisibleTasks logic

Test that:
- Returns up to MAX_VISIBLE_PILLS (4) tasks
- Includes selected task even if not in top recent
- Keeps selected task in place if already in recent

### Step 2: Rewrite TaskPicker component

- Show up to 4 recent task pills
- Add "More" button when >4 tasks that opens Combobox
- Selected task from dropdown replaces 4th pill slot
- Add onDeselect prop for clicking selected pill

### Step 3: Run tests and build

Run: `npm run test:run -- src/components/timer/task-picker.test.ts`
Run: `npm run build`

### Step 4: Commit

```bash
git add src/components/timer/task-picker.tsx src/components/timer/task-picker.test.ts
git commit -m "feat(timer): refactor TaskPicker to hybrid layout with recent pills + dropdown"
```

---

## Task 4: Update SessionSetup to Support Task Deselection

**Files:**
- Modify: `src/components/timer/session-setup.tsx`

### Step 1: Add onDeselect prop to TaskPicker usage

```typescript
<TaskPicker
    tasks={tasks}
    selectedTaskId={selectedTaskId}
    onSelect={(task) => setSelectedTaskId(task.id)}
    onDeselect={() => setSelectedTaskId(null)}
    disabled={isSubmitting}
/>
```

### Step 2: Run build

Run: `npm run build`

### Step 3: Commit

```bash
git add src/components/timer/session-setup.tsx
git commit -m "feat(timer): enable task deselection in SessionSetup"
```

---

## Task 5: Create ProjectPicker Component with Hybrid Layout

**Files:**
- Create: `src/components/timer/project-picker.tsx`
- Create: `src/components/timer/project-picker.test.ts`

### Step 1: Write test for getVisibleProjects logic

### Step 2: Create ProjectPicker component

Similar to TaskPicker but:
- Multi-select (checkboxes in dropdown)
- closeOnSelect={false} - dropdown stays open
- Color dot for each project
- X icon on selected pills

### Step 3: Run build

### Step 4: Commit

```bash
git add src/components/timer/project-picker.tsx src/components/timer/project-picker.test.ts
git commit -m "feat(timer): add ProjectPicker component with hybrid layout"
```

---

## Task 6: Integrate ProjectPicker into SessionSetup

**Files:**
- Modify: `src/components/timer/session-setup.tsx`

### Step 1: Replace inline project picker

1. Import ProjectPicker
2. Remove projectSearch state and filteredProjects memo
3. Replace projects section with ProjectPicker component
4. Remove unused Search import

### Step 2: Run build and tests

### Step 3: Commit

```bash
git add src/components/timer/session-setup.tsx
git commit -m "refactor(timer): use ProjectPicker component in SessionSetup"
```

---

## Task 7: Final Integration Testing

### Step 1: Run all tests

Run: `npm run test:run`

### Step 2: Run build

Run: `npm run build`

### Step 3: Manual testing checklist

- [ ] Task picker shows 4 recent pills when >4 tasks
- [ ] "More" button appears and opens dropdown
- [ ] Search filters tasks in dropdown
- [ ] Selecting task from dropdown shows it in pill row
- [ ] Clicking selected pill deselects it
- [ ] Project picker shows 4 recent pills when >4 projects
- [ ] Project multi-select works in dropdown
- [ ] Selected projects from dropdown appear in pill row
- [ ] Keyboard navigation works (arrows, enter, escape)

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Create Combobox component | `ui/combobox.tsx`, `ui/combobox.test.tsx` |
| 2 | Add keyboard navigation tests | `ui/combobox.test.tsx` |
| 3 | Refactor TaskPicker to hybrid | `timer/task-picker.tsx`, `timer/task-picker.test.ts` |
| 4 | Enable task deselection | `timer/session-setup.tsx` |
| 5 | Create ProjectPicker | `timer/project-picker.tsx`, `timer/project-picker.test.ts` |
| 6 | Integrate ProjectPicker | `timer/session-setup.tsx` |
| 7 | Final integration testing | All files |
