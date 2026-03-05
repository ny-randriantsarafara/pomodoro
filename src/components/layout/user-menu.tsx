'use client';

import { LogOut } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';

export function UserMenu() {
    const { data: session, status } = useSession();

    if (status !== 'authenticated' || !session?.user) {
        return null;
    }

    const { user } = session;

    return (
        <div className="group/user flex items-center gap-3 px-3 py-3">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[var(--border)]">
                {user.image ? (
                    <Image
                        src={user.image}
                        alt={user.name ?? 'User avatar'}
                        fill
                        className="object-cover"
                        sizes="36px"
                    />
                ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm font-medium text-[var(--text-secondary)]">
                        {user.name?.charAt(0).toUpperCase() ?? '?'}
                    </span>
                )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {user.name ?? 'User'}
                </span>
                <button
                    type="button"
                    onClick={() => signOut()}
                    className="flex items-center gap-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--danger)]"
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    <span>Sign out</span>
                </button>
            </div>
        </div>
    );
}
