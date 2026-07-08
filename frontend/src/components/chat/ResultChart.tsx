import { useMemo } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { buildChart, compactUsd } from '@/lib/chartData';

/**
 * FR-006 — when the answer contains a markdown table with a numeric column across
 * ≥2 rows, show a bar chart built ONLY from that streamed table (no invented data).
 * Renders nothing when no suitable table is present.
 */
export function ResultChart({ content }: { content: string }) {
  const chart = useMemo(() => buildChart(content), [content]);
  if (!chart) return null;

  return (
    <div className="max-w-[640px] animate-in fade-in rounded-2xl border bg-card p-5 shadow-sm duration-300">
      <p className="mb-3 text-[13.5px] font-bold text-foreground">{chart.valueLabel}</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chart.data} margin={{ top: 22, right: 8, bottom: 4, left: 8 }}>
          <defs>
            <linearGradient id="fr024BarGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.68 0.14 155)" />
              <stop offset="100%" stopColor="oklch(0.58 0.13 155)" />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: 'oklch(0.92 0.006 90)' }}
            tick={{ fontSize: 11, fill: 'oklch(0.5 0.015 145)' }}
            interval={0}
            height={48}
            angle={-20}
            textAnchor="end"
          />
          <Tooltip
            cursor={{ fill: 'oklch(0.95 0.01 145)' }}
            formatter={(v) => compactUsd(Number(v))}
          />
          <Bar
            dataKey="value"
            fill="url(#fr024BarGreen)"
            radius={[6, 6, 2, 2]}
            maxBarSize={64}
            isAnimationActive
            animationDuration={600}
            animationEasing="ease-out"
          >
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v: unknown) => compactUsd(Number(v))}
              style={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', fill: 'oklch(0.5 0.015 145)' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
