'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DatePickerProps {
    readonly currentDate: Date;
}

function formatDateForUrl(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

export function DatePicker({ currentDate }: DatePickerProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const formattedDisplay = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(currentDate);

    const today = new Date();
    const showTodayButton = !isSameDay(currentDate, today);

    function goToDate(date: Date) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('date', formatDateForUrl(date));
        router.push(`/log?${params.toString()}`);
    }

    function goToPreviousDay() {
        const prev = new Date(currentDate);
        prev.setDate(prev.getDate() - 1);
        goToDate(prev);
    }

    function goToNextDay() {
        const next = new Date(currentDate);
        next.setDate(next.getDate() + 1);
        goToDate(next);
    }

    function goToToday() {
        goToDate(today);
    }

    return (
        <div className="flex items-center justify-between gap-2">
            <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousDay}
                aria-label="Previous day"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span
                className={cn(
                    'min-w-0 flex-1 text-center text-sm font-medium text-[var(--text-primary)]'
                )}
            >
                {formattedDisplay}
            </span>
            <Button
                variant="ghost"
                size="sm"
                onClick={goToNextDay}
                aria-label="Next day"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
            {showTodayButton && (
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={goToToday}
                    className="ml-2 shrink-0"
                >
                    Today
                </Button>
            )}
        </div>
    );
}
