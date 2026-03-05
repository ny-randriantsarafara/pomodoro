'use client';

import { FOCUS_MODES } from '@/lib/constants';
import type { FocusMode } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

export interface ModeSelectorProps {
    readonly selectedMode: FocusMode;
    readonly onSelect: (mode: FocusMode) => void;
    readonly disabled?: boolean;
}

const MODES: ReadonlyArray<FocusMode> = ['short', 'average', 'deep'];

export function ModeSelector({
    selectedMode,
    onSelect,
    disabled = false,
}: ModeSelectorProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {MODES.map((mode) => {
                const config = FOCUS_MODES[mode];
                const isSelected = selectedMode === mode;
                return (
                    <button
                        key={mode}
                        type="button"
                        disabled={disabled}
                        onClick={() => onSelect(mode)}
                        className={cn(
                            'rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200',
                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            'hover:scale-[1.02] active:scale-[0.98]',
                            isSelected
                                ? 'border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--text-primary)]'
                                : 'border-[var(--border)] bg-[#141416] text-[var(--text-secondary)] hover:border-[var(--accent)]/50 hover:text-[var(--text-primary)]'
                        )}
                    >
                        <span className="block">{config.label}</span>
                        <span className="block text-xs opacity-80">
                            {config.workMinutes}m
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
