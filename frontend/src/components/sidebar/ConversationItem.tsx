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
        'group flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent',
        active && 'bg-accent',
      )}
      onClick={() => onSelect(conversation.id)}
    >
      <span className="truncate">{conversation.title}</span>
      <button
        type="button"
        aria-label="Delete conversation"
        className="ml-2 shrink-0 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(conversation.id);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
