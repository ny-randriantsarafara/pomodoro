import { TimerView } from '@/app/(app)/timer/timer-view';

export default function GuestTimerPage() {
    return (
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10">
            <div className="text-center">
                <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-[var(--text-primary)]">
                    Guest Timer
                </h1>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Local only. Your session stays on this device until you sign
                    in later.
                </p>
            </div>

            <TimerView
                projects={[]}
                tasks={[]}
                sessionMode="guest"
                guestLabel="Guest mode stores your timer locally on this browser."
            />
        </div>
    );
}
