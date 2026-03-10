'use client';

import { useState, useTransition } from 'react';
import { updatePrivacySettings } from '@/actions/settings-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface PrivacySettingsFormProps {
    readonly initialAnalyticsOptIn: boolean;
}

export function PrivacySettingsForm({
    initialAnalyticsOptIn,
}: PrivacySettingsFormProps) {
    const [analyticsOptIn, setAnalyticsOptIn] = useState(
        initialAnalyticsOptIn
    );
    const [error, setError] = useState<string | null>(null);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSavedMessage(null);

        startTransition(async () => {
            const result = await updatePrivacySettings({ analyticsOptIn });
            if (!result.success) {
                setError(result.error);
                return;
            }

            setSavedMessage('Privacy settings saved.');
        });
    }

    return (
        <Card padding="lg">
            <CardHeader className="space-y-2">
                <h2 className="text-xl font-medium text-[var(--text-primary)]">
                    Privacy
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                    Keep analytics collection explicit. This only governs
                    product analytics, not required authentication or sync
                    traffic.
                </p>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-3 text-sm text-[var(--text-primary)]">
                        <input
                            type="checkbox"
                            checked={analyticsOptIn}
                            onChange={(event) =>
                                setAnalyticsOptIn(event.target.checked)
                            }
                        />
                        Allow product analytics
                    </label>

                    {error ? (
                        <p className="text-sm text-[var(--danger)]">{error}</p>
                    ) : null}
                    {savedMessage ? (
                        <p className="text-sm text-[var(--text-secondary)]">
                            {savedMessage}
                        </p>
                    ) : null}

                    <Button type="submit" size="md" disabled={isPending}>
                        {isPending ? 'Saving…' : 'Save Privacy Settings'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
