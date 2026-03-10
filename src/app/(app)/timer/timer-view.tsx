'use client';

import { useEffect } from 'react';
import { PictureInPicture2 } from 'lucide-react';
import { useTimer } from '@/hooks/use-timer';
import { usePiP } from '@/hooks/use-pip';
import { TimerRing } from '@/components/timer/timer-ring';
import { TimerDisplay } from '@/components/timer/timer-display';
import { TimerControls } from '@/components/timer/timer-controls';
import { SessionSetup } from '@/components/timer/session-setup';
import { PipTimer } from '@/components/timer/pip-timer';
import type { Project, Task } from '@/lib/db/schema';
import { formatTime } from '@/lib/format-time';

export interface TimerViewProps {
    readonly projects: ReadonlyArray<Project>;
    readonly tasks: ReadonlyArray<Task>;
    readonly sessionMode?: 'signed-in' | 'guest';
    readonly guestLabel?: string;
}

export function TimerView({
    projects,
    tasks,
    sessionMode = 'signed-in',
    guestLabel,
}: TimerViewProps) {
    const {
        activeTimer,
        remainingSeconds,
        phase,
        progress,
        isPaused,
        showRemoteUpdate,
        justCompletedFocus,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
    } = useTimer({
        syncEnabled: sessionMode === 'signed-in',
        sessionMode,
    });

    const { isSupported, pipWindow, openPiP, closePiP } = usePiP();

    // Close PiP when session ends
    useEffect(() => {
        if (phase !== 'focus') {
            closePiP();
        }
    }, [phase, closePiP]);

    return (
        <div className="relative flex flex-col items-center justify-center gap-8 transition-opacity duration-300">
            <div className="relative flex min-h-[320px] flex-col items-center justify-center">
                {phase === 'idle' && (
                    <>
                        <TimerRing
                            progress={0}
                            size={320}
                            strokeWidth={4}
                            className="absolute opacity-40 transition-opacity duration-300"
                        />
                        <div className="relative z-10 w-full max-w-sm">
                            <SessionSetup
                                projects={projects}
                                tasks={tasks}
                                sessionMode={sessionMode}
                                onStart={startTimer}
                            />
                        </div>
                    </>
                )}

                {phase !== 'idle' && (
                    <TimerRing
                        progress={progress}
                        isCompleted={justCompletedFocus}
                        size={320}
                        strokeWidth={4}
                        className="relative z-10 opacity-100 transition-opacity duration-300"
                    >
                        {phase === 'focus' && activeTimer && (
                            <div className="flex flex-col items-center gap-6">
                                <TimerDisplay
                                    remainingSeconds={remainingSeconds}
                                    focusMode={activeTimer.focusMode}
                                    task={activeTimer.task}
                                    projects={activeTimer.projects.map((p) => ({
                                        name: p.name,
                                        color: p.color,
                                    }))}
                                />
                            </div>
                        )}

                        {phase === 'break' && (
                            <div className="flex flex-col items-center gap-2 text-center">
                                <span
                                    className="text-6xl font-mono tabular-nums tracking-tight text-[var(--text-primary)] sm:text-7xl"
                                    style={{ fontFamily: 'var(--font-mono)' }}
                                >
                                    {formatTime(remainingSeconds)}
                                </span>
                                <p className="text-sm font-medium text-[var(--text-secondary)]">
                                    Break
                                </p>
                            </div>
                        )}
                    </TimerRing>
                )}
            </div>

            {phase !== 'idle' && (
                <TimerControls
                    isPaused={isPaused}
                    onPause={pauseTimer}
                    onResume={resumeTimer}
                    onStop={stopTimer}
                />
            )}

            {sessionMode === 'guest' && phase === 'idle' && guestLabel ? (
                <p className="text-sm text-[var(--text-secondary)]">
                    {guestLabel}
                </p>
            ) : null}

            {showRemoteUpdate && (
                <p className="text-sm text-[var(--text-secondary)]">
                    Timer updated from another device.
                </p>
            )}

            {/* PiP toggle — only when focus session active and browser supports it */}
            {phase === 'focus' && activeTimer && isSupported && (
                <button
                    type="button"
                    onClick={pipWindow ? closePiP : () => { openPiP().catch(console.error); }}
                    aria-label={pipWindow ? 'Close picture-in-picture' : 'Open picture-in-picture'}
                    className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <PictureInPicture2 className="h-4 w-4" aria-hidden={true} />
                    {pipWindow ? 'Close PiP' : 'Pop out timer'}
                </button>
            )}

            {phase === 'break' && (
                <p className="text-sm text-[var(--text-secondary)]">
                    Take a break. You&apos;ll return to setup when done.
                </p>
            )}

            {/* PiP portal */}
            {pipWindow && activeTimer && phase === 'focus' && (
                <PipTimer
                    pipWindow={pipWindow}
                    remainingSeconds={remainingSeconds}
                    activeTimer={activeTimer}
                    onPause={pauseTimer}
                    onResume={resumeTimer}
                    onAbandon={stopTimer}
                />
            )}
        </div>
    );
}
