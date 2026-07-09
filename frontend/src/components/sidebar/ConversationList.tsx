import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ApiError } from '@/services/api';
import { chatService } from '@/services/chat.service';
import { useChatStore } from '@/stores/chat.store';
import { ConversationItem } from './ConversationItem';

export function ConversationList({ onSelect }: { onSelect: (id: string) => void }) {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [error, setError] = useState('');

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete;
    setPendingDelete(null);
    setError('');
    try {
      await chatService.remove(id);
      const store = useChatStore.getState();
      store.removeConversation(id);
      if (store.activeId === id) {
        // Active conversation deleted → drop to an empty/new chat (S6).
        store.setActive(null);
        store.setMessages([]);
      }
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? 'Conversation not found.' : 'Delete failed.');
    }
  };

  return (
    <div className="flex-1 space-y-0.5 overflow-y-auto">
      {conversations.length === 0 && (
        <p className="px-2 py-2 text-[13px] text-[oklch(0.6_0.02_220)]">
          No conversations yet — your chats will show up here.
        </p>
      )}
      {conversations.map((c) => (
        <ConversationItem
          key={c.id}
          conversation={c}
          active={c.id === activeId}
          onSelect={onSelect}
          onDelete={setPendingDelete}
        />
      ))}
      {error && <p className="px-2 py-1 text-xs text-destructive">{error}</p>}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete conversation?"
        description="This conversation and its messages will be removed."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
