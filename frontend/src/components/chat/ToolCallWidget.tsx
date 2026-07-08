import { ChevronDown, Database } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ToolCall, ToolResult } from '@/types/chat.types';

interface Props {
  toolCall: ToolCall;
  toolResult?: ToolResult;
  running?: boolean;
}

/**
 * FR-005 — the generated SQL is clearly visible (open by default) while it runs,
 * with the row count once the result arrives. Collapsible; rows expandable when
 * present (live only — the persisted message keeps query + rowCount).
 */
export function ToolCallWidget({ toolCall, toolResult, running }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="max-w-[640px] overflow-hidden rounded-2xl border bg-[oklch(0.985_0.004_90)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3.5 hover:bg-muted/50"
      >
        <span className="flex items-center gap-2">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-[oklch(0.9_0.05_155)]">
            <Database className="h-3 w-3 text-secondary-foreground" />
          </span>
          <span className="font-mono text-[13px] font-semibold text-foreground">execute_sql</span>
          {running ? (
            <span className="text-xs text-muted-foreground">running…</span>
          ) : toolResult ? (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[12px] font-semibold text-secondary-foreground">
              {toolResult.rowCount} row{toolResult.rowCount === 1 ? '' : 's'}
              {toolResult.truncated ? ' (capped)' : ''}
            </span>
          ) : null}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t">
          <pre className="overflow-x-auto whitespace-pre-wrap bg-[oklch(0.22_0.02_250)] px-4 py-3.5 font-mono text-[13px] leading-relaxed text-[oklch(0.85_0.02_155)]">
            {toolCall.arguments}
          </pre>
          {toolResult?.rows && toolResult.rows.length > 0 && (
            <details className="border-t px-4 py-2">
              <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                View {toolResult.rowCount} rows
              </summary>
              <pre className="mt-2 max-h-60 overflow-auto text-[11px] text-muted-foreground">
                {JSON.stringify(toolResult.rows, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
