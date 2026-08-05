import { ChevronDown, Database, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { CopyButton } from '@/components/ui/copy-button';
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
    <div className="max-w-[640px] animate-in fade-in overflow-hidden rounded-[18px] border bg-[oklch(0.985_0.004_90)] shadow-card duration-300">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3.5 hover:bg-muted/50"
      >
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-emerald">
            <Database className="h-3 w-3 text-white" />
          </span>
          <span className="font-mono text-[13px] font-semibold text-foreground">execute_sql</span>
          {running ? (
            // FR-030 — a spinner reads as "still working"; static text reads as stuck.
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              running…
            </span>
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
        <div className="animate-in fade-in slide-in-from-top-1 border-t duration-200">
          <div className="group/sql relative">
            <pre className="overflow-x-auto whitespace-pre-wrap bg-sql-dark px-[19px] py-4 pr-12 font-mono text-[13px] leading-relaxed text-[oklch(0.82_0.05_155)]">
              {toolCall.arguments}
            </pre>
            {/* FR-026 — copy the generated SQL */}
            <CopyButton
              text={toolCall.arguments}
              label="Copy SQL"
              className="absolute right-2.5 top-2.5 text-[oklch(0.7_0.03_155)] opacity-0 transition-opacity hover:bg-white/10 hover:text-white focus-visible:opacity-100 group-hover/sql:opacity-100"
            />
          </div>
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
