import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/types/chat.types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ResultChart } from './ResultChart';
import { StreamingIndicator } from './StreamingIndicator';
import { ToolCallWidget } from './ToolCallWidget';

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-4 py-2 text-sm',
          isUser ? 'bg-primary text-primary-foreground' : 'w-full bg-muted text-foreground',
        )}
      >
        {/* FR-005 — the SQL tool call is visible while it runs. */}
        {message.toolCalls?.map((tc, i) => (
          <ToolCallWidget
            key={i}
            toolCall={tc}
            toolResult={message.toolResults?.[i]}
            running={message.streaming && !message.toolResults?.[i]}
          />
        ))}

        {isUser
          ? message.content && <div className="whitespace-pre-wrap">{message.content}</div>
          : message.content && (
              <>
                <ResultChart content={message.content} />
                <MarkdownRenderer content={message.content} />
              </>
            )}

        {message.streaming && <StreamingIndicator />}

        {message.isPartial && (
          <p className="mt-1 text-xs italic text-muted-foreground">
            response interrupted — ask again for the full answer
          </p>
        )}
        {message.error && <p className="mt-1 text-xs text-destructive">{message.error}</p>}
      </div>
    </div>
  );
}
