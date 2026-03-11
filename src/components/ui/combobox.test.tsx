import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Combobox } from './combobox';

afterEach(() => {
    cleanup();
});

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

    it('moves highlight down with ArrowDown key', async () => {
        const user = userEvent.setup();
        render(
            <Combobox
                items={items}
                value={null}
                onChange={() => {}}
                renderTrigger={() => <button data-testid="trigger">Open</button>}
                renderItem={({ item, isHighlighted }) => (
                    <span data-testid={`item-${item.id}`} data-highlighted={isHighlighted}>
                        {item.label}
                    </span>
                )}
            />
        );

        await user.click(screen.getByTestId('trigger'));
        
        // Initially first item is highlighted
        expect(screen.getByTestId('item-1')).toHaveAttribute('data-highlighted', 'true');
        expect(screen.getByTestId('item-2')).toHaveAttribute('data-highlighted', 'false');
        
        // ArrowDown moves to second item
        await user.keyboard('{ArrowDown}');
        expect(screen.getByTestId('item-1')).toHaveAttribute('data-highlighted', 'false');
        expect(screen.getByTestId('item-2')).toHaveAttribute('data-highlighted', 'true');
        
        // ArrowDown moves to third item
        await user.keyboard('{ArrowDown}');
        expect(screen.getByTestId('item-2')).toHaveAttribute('data-highlighted', 'false');
        expect(screen.getByTestId('item-3')).toHaveAttribute('data-highlighted', 'true');
    });

    it('moves highlight up with ArrowUp key', async () => {
        const user = userEvent.setup();
        render(
            <Combobox
                items={items}
                value={null}
                onChange={() => {}}
                renderTrigger={() => <button data-testid="trigger">Open</button>}
                renderItem={({ item, isHighlighted }) => (
                    <span data-testid={`item-${item.id}`} data-highlighted={isHighlighted}>
                        {item.label}
                    </span>
                )}
            />
        );

        await user.click(screen.getByTestId('trigger'));
        
        // Move down first to have something to go up from
        await user.keyboard('{ArrowDown}');
        await user.keyboard('{ArrowDown}');
        expect(screen.getByTestId('item-3')).toHaveAttribute('data-highlighted', 'true');
        
        // ArrowUp moves back to second item
        await user.keyboard('{ArrowUp}');
        expect(screen.getByTestId('item-3')).toHaveAttribute('data-highlighted', 'false');
        expect(screen.getByTestId('item-2')).toHaveAttribute('data-highlighted', 'true');
        
        // ArrowUp moves back to first item
        await user.keyboard('{ArrowUp}');
        expect(screen.getByTestId('item-2')).toHaveAttribute('data-highlighted', 'false');
        expect(screen.getByTestId('item-1')).toHaveAttribute('data-highlighted', 'true');
    });

    it('selects highlighted item with Enter key', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();
        render(
            <Combobox
                items={items}
                value={null}
                onChange={handleChange}
                renderTrigger={() => <button data-testid="trigger">Open</button>}
                renderItem={({ item }) => <span>{item.label}</span>}
            />
        );

        await user.click(screen.getByTestId('trigger'));
        
        // Move to second item and select with Enter
        await user.keyboard('{ArrowDown}');
        await user.keyboard('{Enter}');
        
        expect(handleChange).toHaveBeenCalledTimes(1);
        expect(handleChange).toHaveBeenCalledWith({ id: '2', label: 'Item Two' });
    });

    it('filters items by search input', async () => {
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
        
        // All items visible initially
        expect(screen.getByText('Item One')).toBeInTheDocument();
        expect(screen.getByText('Item Two')).toBeInTheDocument();
        expect(screen.getByText('Item Three')).toBeInTheDocument();
        
        // Type in search to filter
        await user.type(screen.getByPlaceholderText('Search...'), 'Two');
        
        // Only matching item visible
        expect(screen.queryByText('Item One')).not.toBeInTheDocument();
        expect(screen.getByText('Item Two')).toBeInTheDocument();
        expect(screen.queryByText('Item Three')).not.toBeInTheDocument();
    });

    it('shows empty message when no items match search', async () => {
        const user = userEvent.setup();
        render(
            <Combobox
                items={items}
                value={null}
                onChange={() => {}}
                emptyMessage="No results found"
                renderTrigger={() => <button data-testid="trigger">Open</button>}
                renderItem={({ item }) => <span>{item.label}</span>}
            />
        );

        await user.click(screen.getByTestId('trigger'));
        
        // Type search that matches nothing
        await user.type(screen.getByPlaceholderText('Search...'), 'xyz');
        
        // Empty message shown
        expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('calls onChange when clicking an item', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();
        render(
            <Combobox
                items={items}
                value={null}
                onChange={handleChange}
                renderTrigger={() => <button data-testid="trigger">Open</button>}
                renderItem={({ item }) => <span>{item.label}</span>}
            />
        );

        await user.click(screen.getByTestId('trigger'));
        await user.click(screen.getByText('Item Two'));
        
        expect(handleChange).toHaveBeenCalledTimes(1);
        expect(handleChange).toHaveBeenCalledWith({ id: '2', label: 'Item Two' });
    });
});
