import type { ChatMessage as ChatMessageType } from '@/types/chat.types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ResultChart } from './ResultChart';
import { StreamingIndicator } from './StreamingIndicator';
import { ToolCallWidget } from './ToolCallWidget';

export function ChatMessage({ message }: { message: ChatMessageType }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[520px] whitespace-pre-wrap rounded-[16px_16px_4px_16px] bg-primary px-[18px] py-3 text-[14.5px] font-medium text-primary-foreground shadow-green-lg">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant: bare left-aligned text + white cards (tool call, chart, table) — no bubble.
  return (
    <div className="flex max-w-[640px] flex-col gap-3">
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
          <ResultChart content={message.content} />
          <div className="text-[14.5px] leading-relaxed text-foreground">
            <MarkdownRenderer content={message.content} />
          </div>
        </>
      )}

      {message.streaming && <StreamingIndicator />}

      {message.isPartial && (
        <p className="text-xs italic text-muted-foreground">
          response interrupted — ask again for the full answer
        </p>
      )}
      {message.error && <p className="text-xs text-destructive">{message.error}</p>}
    </div>
  );
}
