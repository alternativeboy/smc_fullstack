import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/chat.types';

interface Props {
  conversation: Conversation;
  active: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ConversationItem({ conversation, active, onSelect, onDelete }: Props) {
  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors',
        active
          ? 'bg-secondary font-semibold text-secondary-foreground'
          : 'text-muted-foreground hover:bg-muted',
      )}
      onClick={() => onSelect(conversation.id)}
    >
      <span className="flex min-w-0 items-center gap-2">
        {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
        <span className="truncate">{conversation.title}</span>
      </span>
      <button
        type="button"
        aria-label="Delete conversation"
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(conversation.id);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
