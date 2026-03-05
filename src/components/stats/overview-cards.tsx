import { Card } from "@/components/ui/card";
import type { StatsData } from "@/types";

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0m";
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

interface OverviewCardsProps {
  readonly stats: StatsData;
}

export function OverviewCards({ stats }: OverviewCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card padding="md">
        <p className="text-3xl font-semibold text-[var(--accent)]">
          {formatDuration(stats.totalFocusSeconds)}
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">all time</p>
      </Card>
      <Card padding="md">
        <p className="text-3xl font-semibold text-[var(--accent)]">
          {stats.currentStreak} days
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Best: {stats.bestStreak} days
        </p>
      </Card>
      <Card padding="md">
        <p className="text-3xl font-semibold text-[var(--accent)]">
          {stats.completedSessions}
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {Math.round(stats.completionRate * 100)}% completion rate
        </p>
      </Card>
      <Card padding="md">
        <p className="text-3xl font-semibold text-[var(--accent)]">
          {formatDuration(stats.thisWeekSeconds)}
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {stats.thisWeekSessions} sessions
        </p>
      </Card>
    </div>
  );
}
