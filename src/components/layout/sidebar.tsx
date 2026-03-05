'use client';

import {
    BarChart3,
    CalendarDays,
    Clock,
    FolderKanban,
    Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserMenu } from './user-menu';

const navItems = [
    { href: '/timer', label: 'Timer', icon: Clock },
    { href: '/log', label: 'Log', icon: CalendarDays },
    { href: '/stats', label: 'Stats', icon: BarChart3 },
    { href: '/projects', label: 'Projects', icon: FolderKanban },
    { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside
            className="group/sidebar flex h-screen w-16 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-200 hover:w-[200px]"
            aria-label="Main navigation"
        >
            <nav className="flex flex-1 flex-col gap-1 overflow-hidden px-3 py-4">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive =
                        pathname === href || pathname.startsWith(`${href}/`);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                                isActive
                                    ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--border)]/50 hover:text-[var(--text-primary)]'
                            }`}
                        >
                            <Icon className="h-5 w-5 shrink-0" aria-hidden />
                            <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
            <div className="mt-auto border-t border-[var(--border)]">
                <UserMenu />
            </div>
        </aside>
    );
}
