import {
    getSessionsByDate,
    getDailyLogSummary,
} from '@/actions/session-actions';
import { DatePicker } from '@/components/session/date-picker';
import { DailySummary } from '@/components/session/daily-summary';
import { SessionList } from '@/components/session/session-list';

function parseDateParam(value: string | undefined): Date {
    const today = new Date();
    if (!value) {
        return today;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return today;
    }
    return parsed;
}

interface LogPageProps {
    readonly searchParams: Promise<{ date?: string }>;
}

export default async function LogPage({ searchParams }: LogPageProps) {
    const params = await searchParams;
    const date = parseDateParam(params.date);

    const [sessions, summary] = await Promise.all([
        getSessionsByDate(date),
        getDailyLogSummary(date),
    ]);

    return (
        <div className="mx-auto max-w-4xl flex flex-col gap-6 p-6 lg:p-10">
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-[var(--text-primary)]">
                Daily Log
            </h1>
            <DatePicker currentDate={date} />
            <DailySummary summary={summary} />
            <SessionList sessions={sessions} />
        </div>
    );
}
