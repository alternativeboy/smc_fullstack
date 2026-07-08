import { BarChart3, Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { UsageBadge } from '@/components/layout/UsageBadge';
import { ConversationList } from '@/components/sidebar/ConversationList';
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
  const clearAuth = useAuthStore((s) => s.clear);
  const messages = useChatStore((s) => s.messages);
  const activeId = useChatStore((s) => s.activeId);
  const conversations = useChatStore((s) => s.conversations);
  const limitError = useChatStore((s) => s.limitError);
  const { send, stop, isStreaming } = useStreamChat();
  const { refresh: refreshUsage } = useUsage();
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeTitle = conversations.find((c) => c.id === activeId)?.title ?? 'Financial Data Chat';

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
    void loadConversations();
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
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="flex w-[280px] flex-col border-r border-sidebar-border bg-sidebar px-4 py-5">
        <div className="mb-5 flex items-center gap-2.5 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald shadow-green">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-primary-foreground" />
          </span>
          <span className="text-[15px] font-extrabold tracking-tight">Finch</span>
        </div>

        <button
          onClick={newChat}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald py-2.5 text-sm font-semibold text-primary-foreground shadow-green transition hover:brightness-105 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>

        <p className="mb-1 mt-6 px-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Recent
        </p>
        <ConversationList onSelect={openConversation} />

        <div className="mt-auto border-t border-sidebar-border pt-3">
          <UsageBadge />
          <button
            onClick={logout}
            className="mt-1 w-full rounded-lg px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b px-8">
          <h1 className="truncate text-lg font-extrabold tracking-tight">{activeTitle}</h1>
        </header>

        <main className="flex-1 overflow-y-auto px-10 py-9">
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {messages.length === 0 && (
              <div className="relative flex animate-in fade-in flex-col items-center gap-7 pt-28 text-center duration-500">
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-20 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-soft blur-2xl"
                />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-[20px] bg-emerald shadow-green">
                  <BarChart3 className="h-7 w-7 text-primary-foreground" />
                </span>
                <div className="relative space-y-3">
                  <h2 className="bg-gradient-to-br from-[oklch(0.32_0.05_155)] to-primary bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
                    Ask anything about your financial data
                  </h2>
                  <p className="text-base text-muted-foreground">
                    Income-statement data for 49 U.S. public companies, 2022–2025.
                  </p>
                </div>
              </div>
            )}
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            <div ref={bottomRef} />
          </div>
        </main>

        {limitError && (
          <div className="animate-in fade-in slide-in-from-bottom-2 border-t border-warning-border bg-warning px-8 py-3 text-center text-warning-foreground duration-300">
            <p className="text-sm font-semibold">{limitError.message}</p>
            <p className="text-xs opacity-80">Resets in ~{resetsIn(limitError.resetAt)}.</p>
            <button
              type="button"
              className="mt-1.5 rounded-lg border border-warning-border px-3 py-1 text-xs font-semibold"
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
