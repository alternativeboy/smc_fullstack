import type { ChatMessage as ChatMessageType } from '@/types/chat.types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ResultChart } from './ResultChart';
import { StreamingIndicator } from './StreamingIndicator';
import { ToolCallWidget } from './ToolCallWidget';

export function ChatMessage({ message }: { message: ChatMessageType }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[520px] animate-in fade-in slide-in-from-bottom-2 whitespace-pre-wrap rounded-[16px_16px_4px_16px] bg-primary px-[18px] py-3 text-[14.5px] font-medium text-primary-foreground shadow-green-lg duration-300">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant: bare left-aligned text + white cards (tool call, chart, table) — no bubble.
  return (
    <div className="flex max-w-[640px] animate-in fade-in slide-in-from-bottom-2 flex-col gap-3 duration-300">
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
            <MarkdownRenderer content={message.content} caret={message.streaming} />
          </div>
        </>
      )}

      {message.streaming && !message.content && <StreamingIndicator />}

      {message.isPartial && (
        <p className="text-xs italic text-muted-foreground">
          response interrupted — ask again for the full answer
        </p>
      )}
      {message.error && <p className="text-xs text-destructive">{message.error}</p>}
    </div>
  );
}
