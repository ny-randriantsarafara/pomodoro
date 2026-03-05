import { Card } from "@/components/ui/card";
import { FOCUS_MODES } from "@/lib/constants";
import type { DailyLogSummary } from "@/types";
import type { FocusMode } from "@/lib/db/schema";

interface DailySummaryProps {
  readonly summary: DailyLogSummary;
}

function formatTotalFocus(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
  }
  return `${minutes}m`;
}

function getModeBreakdown(byMode: Record<FocusMode, number>): string {
  const parts: string[] = [];
  const modes: Array<FocusMode> = ["short", "average", "deep"];
  for (const mode of modes) {
    const count = byMode[mode];
    if (count > 0) {
      const label = FOCUS_MODES[mode].label.replace(" Focus", "");
      parts.push(`${count} ${label}`);
    }
  }
  return parts.join(", ") || "—";
}

export function DailySummary({ summary }: DailySummaryProps) {
  const breakdown = getModeBreakdown(summary.byMode);

  return (
    <Card padding="sm" className="border-[var(--border)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--text-secondary)]">
        <span>
          <strong className="font-medium text-[var(--text-primary)]">
            {formatTotalFocus(summary.totalFocusSeconds)}
          </strong>{" "}
          focus
        </span>
        <span>
          <strong className="font-medium text-[var(--text-primary)]">
            {summary.sessionCount}
          </strong>{" "}
          {summary.sessionCount === 1 ? "session" : "sessions"}
        </span>
        {breakdown !== "—" && (
          <span className="text-xs">{breakdown}</span>
        )}
      </div>
    </Card>
  );
}
