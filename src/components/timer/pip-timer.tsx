'use client';

import { createPortal } from 'react-dom';
import { Pause, Play, X } from 'lucide-react';
import type { ActiveTimer } from '@/types';

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export interface PipTimerProps {
    readonly pipWindow: Window;
    readonly remainingSeconds: number;
    readonly activeTimer: ActiveTimer;
    readonly onPause: () => void;
    readonly onResume: () => void;
    readonly onAbandon: () => Promise<void>;
}

export function PipTimer({
    pipWindow,
    remainingSeconds,
    activeTimer,
    onPause,
    onResume,
    onAbandon,
}: PipTimerProps) {
    const content = (
        <div
            style={{ backgroundColor: '#0A0A0B' }}
            className="flex h-screen flex-col items-center justify-center gap-4 p-4"
        >
            <span
                className="font-mono tabular-nums tracking-tight text-[var(--text-primary)]"
                style={{ fontSize: '3rem', fontFamily: 'var(--font-mono)' }}
            >
                {formatTime(remainingSeconds)}
            </span>

            {activeTimer.task && (
                <p className="max-w-[220px] truncate text-center text-sm text-[var(--text-secondary)]">
                    {activeTimer.task}
                </p>
            )}

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={activeTimer.isPaused ? onResume : onPause}
                    aria-label={activeTimer.isPaused ? 'Resume' : 'Pause'}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-[#0A0A0B] transition-opacity hover:opacity-80"
                >
                    {activeTimer.isPaused ? (
                        <Play className="h-5 w-5" aria-hidden />
                    ) : (
                        <Pause className="h-5 w-5" aria-hidden />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => void onAbandon()}
                    aria-label="Abandon session"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--danger)] text-[#0A0A0B] transition-opacity hover:opacity-80"
                >
                    <X className="h-5 w-5" aria-hidden />
                </button>
            </div>
        </div>
    );

    return createPortal(content, pipWindow.document.body);
}
