import { afterEach, describe, it, expect } from 'vitest';
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
});
