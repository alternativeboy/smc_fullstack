import { useEffect, useRef } from 'react';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { Button } from '@/components/ui/button';
import { useStreamChat } from '@/hooks/useStreamChat';
import { authService } from '@/services/auth.service';
import { chatService } from '@/services/chat.service';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import type { ChatMessage as ChatMessageType } from '@/types/chat.types';

export function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clear);
  const messages = useChatStore((s) => s.messages);
  const activeId = useChatStore((s) => s.activeId);
  const limitError = useChatStore((s) => s.limitError);
  const { send, stop, isStreaming } = useStreamChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount; open the most recent so a reload restores history.
  useEffect(() => {
    chatService
      .list()
      .then((res) => {
        useChatStore.getState().setConversations(res.data);
        if (res.data.length && !useChatStore.getState().activeId) {
          void openConversation(res.data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = async (id: string) => {
    useChatStore.getState().setActive(id);
    const detail = await chatService.get(id);
    const normalized: ChatMessageType[] = detail.messages.map((m) => ({
      ...m,
      content: m.content ?? '',
    }));
    useChatStore.getState().setMessages(normalized);
  };

  const newChat = async () => {
    const conv = await chatService.create();
    useChatStore.getState().addConversation(conv);
    useChatStore.getState().setActive(conv.id);
    useChatStore.getState().setMessages([]);
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
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b p-4">
        <h1 className="font-semibold">Financial Data Chat</h1>
        <div className="flex items-center gap-3 text-sm">
          <Button variant="outline" onClick={newChat}>
            New chat
          </Button>
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
        <div className="border-t bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          {limitError.message}
        </div>
      )}

      <ChatInput onSend={onSend} onStop={stop} isStreaming={isStreaming} disabled={!activeId && isStreaming} />
    </div>
  );
}
