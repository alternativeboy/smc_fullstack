import { useEffect, useRef } from 'react';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { UsageBadge } from '@/components/layout/UsageBadge';
import { ConversationList } from '@/components/sidebar/ConversationList';
import { Button } from '@/components/ui/button';
import { useStreamChat } from '@/hooks/useStreamChat';
import { useUsage } from '@/hooks/useUsage';
import { authService } from '@/services/auth.service';
import { chatService } from '@/services/chat.service';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import type { ChatMessage as ChatMessageType } from '@/types/chat.types';

function resetsIn(resetAt?: string): string {
  if (!resetAt) return 'soon';
  const ms = new Date(resetAt).getTime() - Date.now();
  if (ms <= 0) return 'now';
  const min = Math.ceil(ms / 60000);
  return min < 60 ? `${min} min` : `${Math.ceil(min / 60)} h`;
}

export function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clear);
  const messages = useChatStore((s) => s.messages);
  const activeId = useChatStore((s) => s.activeId);
  const limitError = useChatStore((s) => s.limitError);
  const { send, stop, isStreaming } = useStreamChat();
  const { refresh: refreshUsage } = useUsage();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    const res = await chatService.list().catch(() => null);
    if (!res) return;
    useChatStore.getState().setConversations(res.data);
    if (res.data.length && !useChatStore.getState().activeId) {
      void openConversation(res.data[0].id);
    }
  };

  const openConversation = async (id: string) => {
    useChatStore.getState().setActive(id);
    const detail = await chatService.get(id);
    const normalized: ChatMessageType[] = detail.messages.map((m) => ({ ...m, content: m.content ?? '' }));
    useChatStore.getState().setMessages(normalized);
  };

  const newChat = async () => {
    const conv = await chatService.create();
    useChatStore.getState().addConversation(conv);
    useChatStore.getState().setActive(conv.id);
    useChatStore.getState().setMessages([]);
    useChatStore.getState().setLimitError(null);
  };

  const onSend = async (content: string) => {
    let id = useChatStore.getState().activeId;
    if (!id) {
      const conv = await chatService.create();
      useChatStore.getState().addConversation(conv);
      useChatStore.getState().setActive(conv.id);
      useChatStore.getState().setMessages([]);
      id = conv.id;
    }
    await send(id, content);
    refreshUsage();
    void loadConversations(); // refresh order/titles
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      clearAuth();
      window.location.assign('/login');
    }
  };

  return (
    <div className="flex h-screen">
      <aside className="flex w-64 flex-col border-r">
        <div className="p-3">
          <Button className="w-full" onClick={newChat}>
            + New chat
          </Button>
        </div>
        <ConversationList onSelect={openConversation} />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b p-4">
          <h1 className="font-semibold">Financial Data Chat</h1>
          <div className="flex items-center gap-4 text-sm">
            <UsageBadge />
            <span className="text-muted-foreground">{user?.displayName ?? user?.email}</span>
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.length === 0 && (
              <p className="pt-20 text-center text-muted-foreground">
                Ask a question about the income-statement data of 49 U.S. public companies (2022–2025).
              </p>
            )}
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            <div ref={bottomRef} />
          </div>
        </main>

        {limitError && (
          <div className="border-t bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
            <p>{limitError.message}</p>
            <p className="text-xs">Resets in ~{resetsIn(limitError.resetAt)}.</p>
            <button
              type="button"
              className="mt-1 text-xs underline"
              onClick={() => useChatStore.getState().setLimitError(null)}
            >
              Try again
            </button>
          </div>
        )}

        <ChatInput onSend={onSend} onStop={stop} isStreaming={isStreaming} disabled={!!limitError} />
      </div>
    </div>
  );
}
