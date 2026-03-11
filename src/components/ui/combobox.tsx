'use client';

import {
    type ReactNode,
    useState,
    useEffect,
    useCallback,
    useRef,
    useMemo,
    useId,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface ComboboxItem {
    id: string;
    label: string;
}

export interface ComboboxProps<T extends ComboboxItem> {
    items: ReadonlyArray<T>;
    value: string | null;
    onChange: (item: T) => void;
    renderTrigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
    renderItem: (props: {
        item: T;
        isSelected: boolean;
        isHighlighted: boolean;
    }) => ReactNode;
    closeOnSelect?: boolean;
    searchPlaceholder?: string;
    emptyMessage?: string;
    className?: string;
}

export function Combobox<T extends ComboboxItem>({
    items,
    value,
    onChange,
    renderTrigger,
    renderItem,
    closeOnSelect = true,
    searchPlaceholder = 'Search...',
    emptyMessage = 'No results found',
    className,
}: ComboboxProps<T>) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const listboxId = useId();

    const filteredItems = useMemo(
        () =>
            items.filter((item) =>
                item.label.toLowerCase().includes(search.toLowerCase())
            ),
        [items, search]
    );

    const toggle = useCallback(() => {
        setOpen((prev) => !prev);
    }, []);

    const close = useCallback(() => {
        setOpen(false);
        setSearch('');
        setHighlightedIndex(0);
    }, []);

    const handleSelect = useCallback(
        (item: T) => {
            onChange(item);
            if (closeOnSelect) {
                close();
            }
        },
        [onChange, closeOnSelect, close]
    );

    // Handle click outside
    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                containerRef.current &&
                !containerRef.current.contains(target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(target)
            ) {
                close();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open, close]);

    // Handle Escape key
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                close();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, close]);

    // Handle keyboard navigation
    const handleSearchKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setHighlightedIndex((prev) =>
                        prev < filteredItems.length - 1 ? prev + 1 : 0
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setHighlightedIndex((prev) =>
                        prev > 0 ? prev - 1 : filteredItems.length - 1
                    );
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (filteredItems[highlightedIndex]) {
                        handleSelect(filteredItems[highlightedIndex]);
                    }
                    break;
            }
        },
        [filteredItems, highlightedIndex, handleSelect]
    );

    // Handle search change with highlighted index reset
    const handleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setSearch(e.target.value);
            setHighlightedIndex(0);
        },
        []
    );

    // Focus search input when dropdown opens
    useEffect(() => {
        if (open && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [open]);

    // Calculate dropdown position
    const [dropdownPosition, setDropdownPosition] = useState({
        top: 0,
        left: 0,
        width: 0,
    });

    useEffect(() => {
        if (!open || !triggerRef.current) return;

        const triggerElement = triggerRef.current;

        const updatePosition = () => {
            const rect = triggerElement.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
            });
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [open]);

    const dropdown = open && (
        <div
            ref={dropdownRef}
            id={listboxId}
            role="listbox"
            className={cn(
                'fixed z-50 overflow-hidden rounded-lg border border-[#1F1F23] bg-[#141416] shadow-xl',
                'animate-[fadeIn_0.15s_ease-out]',
                className
            )}
            style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                minWidth: Math.max(dropdownPosition.width, 200),
            }}
        >
            <div className="p-2">
                <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={searchPlaceholder}
                    className={cn(
                        'h-9 w-full rounded-md border border-[#1F1F23] bg-[#0D0D0E] px-3 py-2',
                        'text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]',
                        'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]'
                    )}
                />
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
                {filteredItems.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-[var(--text-secondary)]">
                        {emptyMessage}
                    </div>
                ) : (
                    filteredItems.map((item, index) => (
                        <div
                            key={item.id}
                            role="option"
                            aria-selected={item.id === value}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={cn(
                                'cursor-pointer rounded-md px-3 py-2',
                                'transition-colors',
                                index === highlightedIndex &&
                                    'bg-[var(--border)]/50',
                                item.id === value &&
                                    'text-[var(--accent)]'
                            )}
                        >
                            {renderItem({
                                item,
                                isSelected: item.id === value,
                                isHighlighted: index === highlightedIndex,
                            })}
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div ref={containerRef}>
            <div
                ref={triggerRef}
                onClick={toggle}
                aria-expanded={open}
                aria-controls={listboxId}
            >
                {renderTrigger({ open, toggle })}
            </div>
            {open &&
                typeof document !== 'undefined' &&
                createPortal(dropdown, document.body)}
        </div>
    );
}
