import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/chat.types';

interface Props {
  conversation: Conversation;
  active: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

// Rendered inside the DARK sidebar → light-on-dark styling.
export function ConversationItem({ conversation, active, onSelect, onDelete }: Props) {
  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center justify-between gap-2 rounded-[11px] px-3 py-2.5 text-[13.5px] transition active:scale-[0.99]',
        active
          ? 'bg-[oklch(0.28_0.04_175_/_0.6)] font-semibold text-[oklch(0.92_0.03_155)] shadow-[inset_0_0_0_1px_oklch(0.7_0.15_155_/_0.25)]'
          : 'font-normal text-[oklch(0.68_0.02_220)] hover:bg-white/[0.06] hover:text-[oklch(0.9_0.01_220)]',
      )}
      onClick={() => onSelect(conversation.id)}
    >
      <span className="flex min-w-0 items-center gap-2">
        {active && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[oklch(0.75_0.19_155)] shadow-[0_0_8px_oklch(0.65_0.19_155_/_0.9)]" />
        )}
        <span className="truncate">{conversation.title}</span>
      </span>
      <button
        type="button"
        aria-label="Delete conversation"
        className="shrink-0 text-[oklch(0.6_0.02_220)] opacity-0 transition-opacity hover:text-[oklch(0.72_0.15_25)] group-hover:opacity-100"
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
