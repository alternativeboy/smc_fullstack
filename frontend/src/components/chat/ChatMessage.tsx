import { RotateCw } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/types/chat.types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ResultChart } from './ResultChart';
import { StreamingIndicator } from './StreamingIndicator';
import { ToolCallWidget } from './ToolCallWidget';

interface Props {
  message: ChatMessageType;
  /**
   * FR-030 — re-ask the question that produced this turn. Omitted when the
   * originating question can't be resolved (then no retry affordance is shown);
   * the caller owns that decision.
   */
  onRetry?: () => void;
}

export function ChatMessage({ message, onRetry }: Props) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[520px] animate-in fade-in slide-in-from-bottom-3 whitespace-pre-wrap rounded-[18px_18px_4px_18px] bg-emerald px-[19px] py-3 text-[14.5px] font-semibold text-white shadow-green-lg duration-300">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant: bare left-aligned text + white cards (tool call, chart, table) — no bubble.
  return (
    <div className="group/msg flex max-w-[640px] animate-in fade-in slide-in-from-bottom-3 flex-col gap-3 duration-300">
      {message.toolCalls?.map((tc, i) => (
        <ToolCallWidget
          key={i}
          toolCall={tc}
          toolResult={message.toolResults?.[i]}
          running={message.streaming && !message.toolResults?.[i]}
        />
      ))}

      {message.content && (
        <>
          {/* Chart only once the answer is complete: parsing/animating per token
              restarts the bar animation on every re-render (jank), and the table
              may still be mid-stream. Mounting it on completion plays the grow-in
              animation exactly once. */}
          {!message.streaming && <ResultChart content={message.content} />}
          <div className="text-[14.5px] leading-relaxed text-foreground">
            <MarkdownRenderer content={message.content} caret={message.streaming} />
          </div>
        </>
      )}

      {message.streaming && !message.content && (
        <StreamingIndicator
          phase={message.phase}
          rowCount={message.toolResults?.[message.toolResults.length - 1]?.rowCount}
          startedAt={message.startedAt}
        />
      )}

      {/* FR-026 — copy the completed response (markdown source; hidden while streaming) */}
      {message.content && !message.streaming && (
        <CopyButton
          text={message.content}
          label="Copy response"
          withLabel
          className="-mt-1 self-start text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/msg:opacity-100"
        />
      )}

      {/* FR-030 — a stopped or failed turn is a dead end without a way back in.
          Retry re-asks as a new turn (there is no regenerate endpoint), so the
          question reappears in the transcript — which is what actually happens. */}
      {(message.isPartial || message.error) && !message.streaming && (
        <div className="flex flex-wrap items-center gap-2.5">
          <p className={cn('text-xs', message.error ? 'text-destructive' : 'italic text-muted-foreground')}>
            {message.error ?? 'Response interrupted.'}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-[0.97]"
            >
              <RotateCw className="h-3 w-3" /> Ask again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
