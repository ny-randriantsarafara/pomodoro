import type { ReactNode } from 'react';

interface Props {
    readonly children: ReactNode;
}

export default function AuthLayout({ children }: Props) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
            {children}
        </div>
    );
}
