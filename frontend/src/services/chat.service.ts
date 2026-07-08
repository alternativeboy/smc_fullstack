import { api } from './api';
import type { Conversation, ConversationDetail, Paginated } from '@/types/chat.types';

export const chatService = {
  list: (page = 1, limit = 20) =>
    api<Paginated<Conversation>>(`/api/conversations?page=${page}&limit=${limit}`),
  create: () => api<Conversation>('/api/conversations', { method: 'POST' }),
  get: (id: string) => api<ConversationDetail>(`/api/conversations/${id}`),
  remove: (id: string) => api<{ message: string }>(`/api/conversations/${id}`, { method: 'DELETE' }),
};
