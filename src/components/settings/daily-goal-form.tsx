'use client';

import { useState, useTransition } from 'react';
import { updateDailyGoalMinutes } from '@/actions/settings-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    DAILY_GOAL_MINUTES_MAX,
    DAILY_GOAL_MINUTES_MIN,
} from '@/lib/constants';

interface DailyGoalFormProps {
    readonly initialDailyGoalMinutes: number;
}

export function DailyGoalForm({
    initialDailyGoalMinutes,
}: DailyGoalFormProps) {
    const [dailyGoalMinutes, setDailyGoalMinutes] = useState(
        String(initialDailyGoalMinutes)
    );
    const [error, setError] = useState<string | null>(null);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSavedMessage(null);

        const parsed = Number(dailyGoalMinutes);
        if (!Number.isFinite(parsed)) {
            setError('Daily goal must be a valid number of minutes.');
            return;
        }

        if (
            parsed < DAILY_GOAL_MINUTES_MIN ||
            parsed > DAILY_GOAL_MINUTES_MAX
        ) {
            setError(
                `Daily goal must be between ${DAILY_GOAL_MINUTES_MIN} and ${DAILY_GOAL_MINUTES_MAX} minutes.`
            );
            return;
        }

        startTransition(async () => {
            const result = await updateDailyGoalMinutes(parsed);
            if (!result.success) {
                setError(result.error);
                return;
            }

            setSavedMessage('Daily goal saved.');
        });
    }

    return (
        <Card padding="lg">
            <CardHeader className="space-y-2">
                <h2 className="text-xl font-medium text-[var(--text-primary)]">
                    Daily Goal
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                    Set your default focus target in minutes. Use `0` if you
                    want to turn the goal off for now.
                </p>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Daily Goal Minutes"
                        inputMode="numeric"
                        min={DAILY_GOAL_MINUTES_MIN}
                        max={DAILY_GOAL_MINUTES_MAX}
                        value={dailyGoalMinutes}
                        onChange={(event) =>
                            setDailyGoalMinutes(event.target.value)
                        }
                    />

                    {error ? (
                        <p className="text-sm text-[var(--danger)]">{error}</p>
                    ) : null}
                    {savedMessage ? (
                        <p className="text-sm text-[var(--text-secondary)]">
                            {savedMessage}
                        </p>
                    ) : null}

                    <Button type="submit" size="md" disabled={isPending}>
                        {isPending ? 'Saving…' : 'Save Daily Goal'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
