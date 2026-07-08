import { create } from 'zustand';
import type { ChatMessage, Conversation } from '@/types/chat.types';

interface LimitError {
  message: string;
  resetAt?: string;
}

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
  messages: ChatMessage[]; // messages for the active conversation
  limitError: LimitError | null;

  setConversations: (c: Conversation[]) => void;
  addConversation: (c: Conversation) => void;
  removeConversation: (id: string) => void;
  setActive: (id: string | null) => void;
  setMessages: (m: ChatMessage[]) => void;
  pushMessage: (m: ChatMessage) => void;
  patchMessage: (id: string, patch: Partial<ChatMessage> | ((m: ChatMessage) => Partial<ChatMessage>)) => void;
  removeMessage: (id: string) => void;
  setLimitError: (e: LimitError | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeId: null,
  messages: [],
  limitError: null,

  setConversations: (conversations) => set({ conversations }),
  addConversation: (c) => set((s) => ({ conversations: [c, ...s.conversations] })),
  removeConversation: (id) => set((s) => ({ conversations: s.conversations.filter((c) => c.id !== id) })),
  setActive: (activeId) => set({ activeId }),
  setMessages: (messages) => set({ messages }),
  pushMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  patchMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m,
      ),
    })),
  removeMessage: (id) => set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),
  setLimitError: (limitError) => set({ limitError }),
}));
