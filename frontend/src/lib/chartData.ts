// Best-effort extraction of a numeric chart from a markdown table in the answer.
// Works from streamed content only (no client-side number invention) and survives
// reload (the table lives in the persisted assistant text).

export function parseFinancialNumber(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim();
  const negative = /^\(.*\)$/.test(s) || s.startsWith('-') || s.startsWith('−');
  s = s.replace(/[(),−-]/g, '').replace(/\$/g, '').replace(/,/g, '').trim();
  const m = s.match(/^([\d.]+)\s*(billion|million|thousand|b|m|k)?/i);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (Number.isNaN(n)) return null;
  const unit = (m[2] ?? '').toLowerCase();
  if (unit === 'billion' || unit === 'b') n *= 1e9;
  else if (unit === 'million' || unit === 'm') n *= 1e6;
  else if (unit === 'thousand' || unit === 'k') n *= 1e3;
  return negative ? -n : n;
}

function extractTable(content: string): { headers: string[]; rows: string[][] } | null {
  const tableLines: string[] = [];
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (t.startsWith('|')) tableLines.push(t);
    else if (tableLines.length) break;
  }
  if (tableLines.length < 3) return null;
  if (!/^\|[\s:|-]+\|?$/.test(tableLines[1])) return null;
  const parse = (row: string) =>
    row
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
  const headers = parse(tableLines[0]);
  const rows = tableLines.slice(2).map(parse).filter((r) => r.length === headers.length);
  return { headers, rows };
}

export interface ChartData {
  valueLabel: string;
  data: Array<{ label: string; value: number }>;
}

export function buildChart(content: string): ChartData | null {
  const table = extractTable(content);
  if (!table || table.rows.length < 2) return null;
  const { headers, rows } = table;

  // Value column = the non-label column with the most numeric cells. Year-like
  // columns are never the value — otherwise a | Company | Year | Revenue | table
  // would tie on numeric count and chart 2022–2025 as the values.
  let bestCol = -1;
  let bestCount = 0;
  for (let c = 1; c < headers.length; c++) {
    if (/\b(year|fiscal|fy|quarter)\b/i.test(headers[c])) continue;
    const count = rows.filter((r) => parseFinancialNumber(r[c]) != null).length;
    if (count > bestCount) {
      bestCount = count;
      bestCol = c;
    }
  }
  if (bestCol < 0 || bestCount < 2) return null;

  const data = rows
    .map((r) => ({ label: r[0], value: parseFinancialNumber(r[bestCol]) }))
    .filter((d): d is { label: string; value: number } => d.value != null)
    .slice(0, 20);
  if (data.length < 2) return null;

  return { valueLabel: headers[bestCol], data };
}

export function compactUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n}`;
}
