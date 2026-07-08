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
    <div className="mb-2 overflow-hidden rounded-md border bg-background/70 text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-2 py-1.5 hover:bg-accent"
      >
        <span className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5" />
          <span className="font-medium">execute_sql</span>
          {running ? (
            <span className="text-muted-foreground">running…</span>
          ) : toolResult ? (
            <span className="text-muted-foreground">
              {toolResult.rowCount} row{toolResult.rowCount === 1 ? '' : 's'}
              {toolResult.truncated ? ' (capped)' : ''}
            </span>
          ) : null}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t p-2">
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono">{toolCall.arguments}</pre>
          {toolResult?.rows && toolResult.rows.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-muted-foreground">View rows</summary>
              <pre className="mt-1 max-h-60 overflow-auto">{JSON.stringify(toolResult.rows, null, 2)}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
