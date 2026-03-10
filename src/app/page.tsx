import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function HomePage() {
    const session = await auth();

    if (session) {
        redirect('/timer');
    }

    return (
        <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-10 px-6 py-16 text-center">
            <div className="flex flex-col gap-4">
                <p className="text-sm uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                    Pomodoro
                </p>
                <h1 className="font-[family-name:var(--font-display)] text-5xl font-normal text-[var(--text-primary)] sm:text-6xl">
                    Focus without signing in first.
                </h1>
                <p className="mx-auto max-w-2xl text-base text-[var(--text-secondary)] sm:text-lg">
                    Start a local-only focus session immediately, or sign in to
                    sync your timer across devices.
                </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                    href="/guest/timer"
                    className="inline-flex h-12 items-center justify-center rounded-lg bg-[#A0A0FF] px-6 text-base font-medium text-[#0A0A0B] transition-colors hover:bg-[var(--accent-hover)]"
                >
                    Continue as guest
                </Link>
                <Link
                    href="/sign-in"
                    className="inline-flex h-12 items-center justify-center rounded-lg border border-[var(--border)] px-6 text-base font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--border)]/50"
                >
                    Sign in to sync
                </Link>
            </div>
        </main>
    );
}
