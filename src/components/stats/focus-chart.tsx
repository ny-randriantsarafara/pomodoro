'use client';

import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { DailyFocusPoint } from '@/types';
import { formatDuration } from './overview-cards';

interface FocusChartProps {
    readonly dailyFocus: ReadonlyArray<DailyFocusPoint>;
}

interface TooltipPayload {
    payload?: { date: string; totalMinutes: number; sessionCount: number };
}

function CustomTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: ReadonlyArray<TooltipPayload>;
}) {
    if (!active || !payload?.[0]?.payload) return null;
    const { date, totalMinutes, sessionCount } = payload[0].payload;
    const formatted = formatDuration(totalMinutes * 60);
    return (
        <div className="rounded-lg border border-[#1F1F23] bg-[#141416] px-3 py-2 shadow-lg">
            <p className="text-sm text-[var(--text-primary)]">
                {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                })}
            </p>
            <p className="text-sm font-medium text-[var(--accent)]">
                {formatted}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
                {sessionCount} session{sessionCount !== 1 ? 's' : ''}
            </p>
        </div>
    );
}

export function FocusChart({ dailyFocus }: FocusChartProps) {
    const data = dailyFocus.map((d) => ({
        date: d.date,
        totalMinutes: d.totalMinutes,
        sessionCount: d.sessionCount,
    }));

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1F1F23"
                    vertical={false}
                />
                <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                        const d = new Date(value + 'T12:00:00');
                        return d.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                        });
                    }}
                    tick={{ fill: '#71717A', fontSize: 12 }}
                    axisLine={{ stroke: '#1F1F23' }}
                    tickLine={{ stroke: '#1F1F23' }}
                    interval={4}
                />
                <YAxis
                    dataKey="totalMinutes"
                    tick={{ fill: '#71717A', fontSize: 12 }}
                    axisLine={{ stroke: '#1F1F23' }}
                    tickLine={{ stroke: '#1F1F23' }}
                    label={{
                        value: 'min',
                        position: 'insideTopRight',
                        fill: '#71717A',
                    }}
                />
                <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: 'rgba(160,160,255,0.1)' }}
                />
                <Bar
                    dataKey="totalMinutes"
                    fill="#A0A0FF"
                    radius={[4, 4, 0, 0]}
                    name="Minutes"
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
