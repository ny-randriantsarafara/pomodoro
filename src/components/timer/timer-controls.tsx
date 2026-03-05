'use client';

import { useState } from 'react';
import { Pause, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface TimerControlsProps {
    readonly isPaused: boolean;
    readonly onPause: () => void;
    readonly onResume: () => void;
    readonly onAbandon: () => void;
    readonly className?: string;
}

export function TimerControls({
    isPaused,
    onPause,
    onResume,
    onAbandon,
    className,
}: TimerControlsProps) {
    const [showConfirm, setShowConfirm] = useState(false);

    const handleAbandonClick = () => setShowConfirm(true);
    const handleConfirmClose = () => setShowConfirm(false);

    const handleAbandonConfirm = async () => {
        await onAbandon();
        setShowConfirm(false);
    };

    return (
        <div
            className={cn('flex items-center justify-center gap-3', className)}
        >
            <Button
                variant="primary"
                size="lg"
                onClick={isPaused ? onResume : onPause}
                aria-label={isPaused ? 'Resume' : 'Pause'}
            >
                {isPaused ? (
                    <Play className="h-5 w-5" aria-hidden />
                ) : (
                    <Pause className="h-5 w-5" aria-hidden />
                )}
            </Button>
            <Button
                variant="danger"
                size="lg"
                onClick={handleAbandonClick}
                aria-label="Abandon session"
            >
                <X className="h-5 w-5" aria-hidden />
            </Button>

            <Dialog
                open={showConfirm}
                onClose={handleConfirmClose}
                title="Abandon session?"
            >
                <div className="flex flex-col gap-4">
                    <p className="text-[var(--text-secondary)]">
                        Your progress will not be saved. Are you sure you want
                        to abandon this session?
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="secondary"
                            onClick={handleConfirmClose}
                        >
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleAbandonConfirm}>
                            Abandon
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
