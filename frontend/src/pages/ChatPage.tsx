import { BarChart3, LogOut, Menu, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { UsageBadge } from '@/components/layout/UsageBadge';
import { ConversationList } from '@/components/sidebar/ConversationList';
import { useStreamChat } from '@/hooks/useStreamChat';
import { useUsage } from '@/hooks/useUsage';
import { cn } from '@/lib/utils';
import { authService } from '@/services/auth.service';
import { chatService } from '@/services/chat.service';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import type { ChatMessage as ChatMessageType } from '@/types/chat.types';

// FR-028 — curated to exercise different capabilities: a multi-company
// comparison (table + chart), a single value, a trend question, and a
// sector ranking. All answerable from the 49-company / 2022–2025 data.
const EXAMPLE_PROMPTS = [
  'Compare revenue of all Technology companies in 2024',
  "What was Apple's net income in 2023?",
  'Which company grew revenue the most from 2022 to 2025?',
  'Top 5 companies by net income in 2024',
];

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
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer

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
    setSidebarOpen(false); // close the drawer on selection (mobile)
    useChatStore.getState().setActive(id);
    const detail = await chatService.get(id);
    const normalized: ChatMessageType[] = detail.messages.map((m) => ({ ...m, content: m.content ?? '' }));
    useChatStore.getState().setMessages(normalized);
  };

  const newChat = async () => {
    setSidebarOpen(false);
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
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar — off-canvas drawer < lg, static ≥ lg */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[284px] flex-col bg-sidebar-dark px-4 py-5 transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-6 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-emerald bg-[length:200%_200%] shadow-green animate-gradient-shift">
              <span className="h-[13px] w-[13px] rounded-[4px] bg-primary-foreground" />
            </span>
            <span className="text-[15.5px] font-extrabold tracking-tight text-white">Finch</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            className="rounded-lg p-1 text-[oklch(0.6_0.02_220)] transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={newChat}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald bg-[length:200%_200%] py-2.5 text-sm font-semibold text-primary-foreground shadow-green transition hover:brightness-105 active:scale-[0.98] animate-glow"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> New chat
        </button>

        <p className="mb-2.5 mt-6 px-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-[oklch(0.55_0.02_145)]">
          Recent
        </p>
        <ConversationList onSelect={openConversation} />

        <div className="mt-auto border-t border-white/10 pt-3">
          <UsageBadge />
          <button
            onClick={logout}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[oklch(0.6_0.02_220)] transition hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" /> Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-b from-white to-[oklch(0.985_0.006_145)]">
        <header className="flex h-16 flex-shrink-0 items-center gap-2 border-b px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="-ml-1 rounded-lg p-2 text-foreground transition hover:bg-muted lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="truncate text-lg font-extrabold tracking-tight">{activeTitle}</h1>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-10 lg:py-9">
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {messages.length === 0 && (
              <div className="relative flex animate-in fade-in flex-col items-center gap-6 pt-16 text-center duration-500 lg:gap-7 lg:pt-28">
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-12 h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-soft blur-2xl lg:top-20 lg:h-64 lg:w-64"
                />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-[20px] bg-emerald shadow-green">
                  <BarChart3 className="h-7 w-7 text-white" />
                </span>
                <div className="relative space-y-3">
                  <h2 className="bg-gradient-to-br from-[oklch(0.2_0.02_220)] to-primary bg-clip-text text-2xl font-extrabold tracking-tight text-transparent lg:text-[28px]">
                    Ask anything about your financial data
                  </h2>
                  <p className="text-sm text-muted-foreground lg:text-base">
                    Income-statement data for 49 U.S. public companies, 2022–2025.
                  </p>
                </div>
                {/* FR-028 — example prompts: send on click via the normal onSend path */}
                <div className="relative flex w-full max-w-lg flex-wrap items-center justify-center gap-2">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => onSend(prompt)}
                      className="rounded-full border border-border bg-card px-4 py-2 text-left text-sm text-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-[0.97]"
                    >
                      {prompt}
                    </button>
                  ))}
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
          <div className="mx-4 mb-4 flex animate-in fade-in slide-in-from-bottom-2 items-center gap-4 rounded-2xl border border-warning-border bg-warning px-5 py-4 text-warning-foreground shadow-[0_6px_18px_-8px_oklch(0.6_0.1_60/0.3)] duration-300 lg:mx-8">
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-extrabold">{limitError.message}</p>
              <p className="text-xs opacity-80">Resets in ~{resetsIn(limitError.resetAt)}.</p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-[11px] border border-warning-border bg-white px-4 py-2 text-xs font-bold transition hover:brightness-95"
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
