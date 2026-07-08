import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/types/chat.types';
import { StreamingIndicator } from './StreamingIndicator';

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-4 py-2 text-sm',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
        )}
      >
        {/* Tool call stub — the collapsible ToolCallWidget lands in Phase 6.3. */}
        {message.toolCalls?.map((tc, i) => (
          <pre key={i} className="mb-2 overflow-x-auto rounded bg-background/60 p-2 text-xs">
            🔧 {tc.arguments}
            {message.toolResults?.[i] ? `  →  ${message.toolResults[i].rowCount} row(s)` : ''}
          </pre>
        ))}

        {message.content && <div className="whitespace-pre-wrap">{message.content}</div>}
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
