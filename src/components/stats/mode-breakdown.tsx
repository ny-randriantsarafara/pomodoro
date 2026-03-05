"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { FocusMode } from "@/lib/db/schema";
import type { StatsData } from "@/types";
import { FOCUS_MODES } from "@/lib/constants";
import { formatDuration } from "./overview-cards";

const MODE_COLORS: Record<FocusMode, string> = {
  short: "#60A5FA",
  average: "#FBBF24",
  deep: "#A78BFA",
};

interface ModeBreakdownProps {
  readonly byMode: StatsData["byMode"];
  readonly preferredMode: FocusMode;
}

interface TooltipPayload {
  payload?: { name: string; count: number; seconds: number };
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<TooltipPayload>;
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const { name, count, seconds } = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#1F1F23] bg-[#141416] px-3 py-2 shadow-lg">
      <p className="text-sm font-medium text-[var(--text-primary)]">{name}</p>
      <p className="text-sm text-[var(--accent)]">{formatDuration(seconds)}</p>
      <p className="text-xs text-[var(--text-secondary)]">
        {count} session{count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export function ModeBreakdown({ byMode, preferredMode }: ModeBreakdownProps) {
  const data = (["short", "average", "deep"] as const).map((mode) => ({
    name: FOCUS_MODES[mode].label,
    mode,
    count: byMode[mode].count,
    seconds: byMode[mode].seconds,
    value: byMode[mode].count,
  }));

  const preferredLabel = FOCUS_MODES[preferredMode].label;

  return (
    <div>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.mode} fill={MODE_COLORS[entry.mode]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 flex flex-wrap justify-center gap-6">
        {data.map((d) => (
          <div key={d.mode} className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: MODE_COLORS[d.mode] }}
            />
            <span className="text-sm text-[var(--text-primary)]">{d.name}</span>
            <span className="text-sm text-[var(--text-secondary)]">
              {d.count} · {formatDuration(d.seconds)}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-sm text-[var(--text-secondary)]">
        Preferred: {preferredLabel}
      </p>
    </div>
  );
}
