'use client';

import { type ReactNode, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DialogProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    className?: string;
}

export function Dialog({
    open,
    onClose,
    title,
    children,
    className,
}: DialogProps) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        },
        [onClose]
    );

    useEffect(() => {
        if (!open) return;
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [open, handleKeyDown]);

    const handleBackdropClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) onClose();
        },
        [onClose]
    );

    if (!open) return null;

    const content = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/60 animate-[fadeIn_0.2s_ease-out]"
                aria-hidden
                onClick={handleBackdropClick}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'dialog-title' : undefined}
                className={cn(
                    'relative z-10 w-full max-w-md rounded-xl border border-[#1F1F23] bg-[#141416] p-6 shadow-xl animate-[fadeIn_0.2s_ease-out]',
                    className
                )}
            >
                <div className="mb-4 flex items-start justify-between gap-2">
                    {title ? (
                        <h2
                            id="dialog-title"
                            className="text-lg font-semibold text-[var(--text-primary)]"
                        >
                            {title}
                        </h2>
                    ) : (
                        <span className="flex-1" />
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className={cn(
                            '-mr-2 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)]',
                            'hover:bg-[var(--border)]/50 hover:text-[var(--text-primary)]',
                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2'
                        )}
                        aria-label="Close dialog"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
