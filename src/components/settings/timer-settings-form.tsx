'use client';

import { useState, useTransition } from 'react';
import { updateTimerSettings } from '@/actions/settings-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    TIMER_LONG_BREAK_FREQUENCY_MAX,
    TIMER_LONG_BREAK_FREQUENCY_MIN,
    TIMER_LONG_BREAK_MINUTES_MAX,
    TIMER_LONG_BREAK_MINUTES_MIN,
    TIMER_SHORT_BREAK_MINUTES_MAX,
    TIMER_SHORT_BREAK_MINUTES_MIN,
    TIMER_WORK_MINUTES_MAX,
    TIMER_WORK_MINUTES_MIN,
} from '@/lib/constants';
import { validateTimerSettings } from '@/lib/validators';
import type { AppSettings, TimerSettings } from '@/types';

interface TimerSettingsFormProps {
    readonly initialSettings: AppSettings;
}

function parseNumber(value: string): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export function TimerSettingsForm({
    initialSettings,
}: TimerSettingsFormProps) {
    const [workMinutes, setWorkMinutes] = useState(
        String(initialSettings.workMinutes)
    );
    const [shortBreakMinutes, setShortBreakMinutes] = useState(
        String(initialSettings.shortBreakMinutes)
    );
    const [longBreakMinutes, setLongBreakMinutes] = useState(
        String(initialSettings.longBreakMinutes)
    );
    const [longBreakFrequency, setLongBreakFrequency] = useState(
        String(initialSettings.longBreakFrequency)
    );
    const [autoStartBreaks, setAutoStartBreaks] = useState(
        initialSettings.autoStartBreaks
    );
    const [autoStartFocusSessions, setAutoStartFocusSessions] = useState(
        initialSettings.autoStartFocusSessions
    );
    const [error, setError] = useState<string | null>(null);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSavedMessage(null);

        const nextSettings: TimerSettings = {
            workMinutes: parseNumber(workMinutes) ?? NaN,
            shortBreakMinutes: parseNumber(shortBreakMinutes) ?? NaN,
            longBreakMinutes: parseNumber(longBreakMinutes) ?? NaN,
            longBreakFrequency: parseNumber(longBreakFrequency) ?? NaN,
            autoStartBreaks,
            autoStartFocusSessions,
        };

        const validationError = validateTimerSettings(nextSettings);
        if (validationError) {
            setError(validationError);
            return;
        }

        startTransition(async () => {
            const result = await updateTimerSettings(nextSettings);
            if (!result.success) {
                setError(result.error);
                return;
            }

            setSavedMessage('Timer preferences saved.');
        });
    }

    return (
        <Card padding="lg">
            <CardHeader className="space-y-2">
                <h2 className="text-xl font-medium text-[var(--text-primary)]">
                    Timer Preferences
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                    Tune work and break durations without touching the shared
                    timer logic.
                </p>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input
                            label="Work Minutes"
                            inputMode="numeric"
                            min={TIMER_WORK_MINUTES_MIN}
                            max={TIMER_WORK_MINUTES_MAX}
                            value={workMinutes}
                            onChange={(event) =>
                                setWorkMinutes(event.target.value)
                            }
                        />
                        <Input
                            label="Short Break Minutes"
                            inputMode="numeric"
                            min={TIMER_SHORT_BREAK_MINUTES_MIN}
                            max={TIMER_SHORT_BREAK_MINUTES_MAX}
                            value={shortBreakMinutes}
                            onChange={(event) =>
                                setShortBreakMinutes(event.target.value)
                            }
                        />
                        <Input
                            label="Long Break Minutes"
                            inputMode="numeric"
                            min={TIMER_LONG_BREAK_MINUTES_MIN}
                            max={TIMER_LONG_BREAK_MINUTES_MAX}
                            value={longBreakMinutes}
                            onChange={(event) =>
                                setLongBreakMinutes(event.target.value)
                            }
                        />
                        <Input
                            label="Long Break Frequency"
                            inputMode="numeric"
                            min={TIMER_LONG_BREAK_FREQUENCY_MIN}
                            max={TIMER_LONG_BREAK_FREQUENCY_MAX}
                            value={longBreakFrequency}
                            onChange={(event) =>
                                setLongBreakFrequency(event.target.value)
                            }
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-3 text-sm text-[var(--text-primary)]">
                            <input
                                type="checkbox"
                                checked={autoStartBreaks}
                                onChange={(event) =>
                                    setAutoStartBreaks(event.target.checked)
                                }
                            />
                            Auto-start breaks
                        </label>
                        <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-3 text-sm text-[var(--text-primary)]">
                            <input
                                type="checkbox"
                                checked={autoStartFocusSessions}
                                onChange={(event) =>
                                    setAutoStartFocusSessions(
                                        event.target.checked
                                    )
                                }
                            />
                            Auto-start focus sessions
                        </label>
                    </div>

                    {error ? (
                        <p className="text-sm text-[var(--danger)]">{error}</p>
                    ) : null}
                    {savedMessage ? (
                        <p className="text-sm text-[var(--text-secondary)]">
                            {savedMessage}
                        </p>
                    ) : null}

                    <Button type="submit" size="md" disabled={isPending}>
                        {isPending ? 'Saving…' : 'Save Timer Preferences'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
