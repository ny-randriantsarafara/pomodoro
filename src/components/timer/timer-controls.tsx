'use client';

import { useState } from 'react';
import { Pause, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface TimerControlsProps {
    readonly isPaused: boolean;
    readonly onPause: () => void | Promise<void>;
    readonly onResume: () => void | Promise<void>;
    readonly onStop: () => void | Promise<void>;
    readonly className?: string;
}

export function TimerControls({
    isPaused,
    onPause,
    onResume,
    onStop,
    className,
}: TimerControlsProps) {
    const [showConfirm, setShowConfirm] = useState(false);

    const handleStopClick = () => setShowConfirm(true);
    const handleConfirmClose = () => setShowConfirm(false);

    const handleStopConfirm = async () => {
        await onStop();
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
                onClick={handleStopClick}
                aria-label="Stop timer"
            >
                <X className="h-5 w-5" aria-hidden />
            </Button>

            <Dialog
                open={showConfirm}
                onClose={handleConfirmClose}
                title="Stop timer?"
            >
                <div className="flex flex-col gap-4">
                    <p className="text-[var(--text-secondary)]">
                        The current timer will end immediately. Are you sure you
                        want to stop it?
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="secondary"
                            onClick={handleConfirmClose}
                        >
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleStopConfirm}>
                            Stop
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
