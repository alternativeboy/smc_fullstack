import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
    <div className="my-2 rounded-md border p-2">
      <p className="mb-1 text-xs text-muted-foreground">{chart.valueLabel}</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chart.data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => compactUsd(Number(v))} width={56} />
          <Tooltip formatter={(v) => compactUsd(Number(v))} />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
