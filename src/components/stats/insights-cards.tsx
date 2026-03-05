import { Card } from "@/components/ui/card";
import type { StatsData } from "@/types";

function formatPeakHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

interface InsightsCardsProps {
  readonly stats: StatsData;
}

export function InsightsCards({ stats }: InsightsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card padding="md">
        <p className="text-3xl font-semibold text-[var(--accent)]">
          {stats.mostProductiveDay ?? "No data yet"}
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          most productive day
        </p>
      </Card>
      <Card padding="md">
        <p className="text-3xl font-semibold text-[var(--accent)]">
          {stats.peakHour !== null
            ? formatPeakHour(stats.peakHour)
            : "No data yet"}
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          peak focus hour
        </p>
      </Card>
    </div>
  );
}
