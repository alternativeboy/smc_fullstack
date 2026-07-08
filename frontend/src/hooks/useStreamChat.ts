import { useCallback, useRef, useState } from 'react';
import { trySilentRefresh } from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';
import { useChatStore } from '@/stores/chat.store';
import type { StreamEvent } from '@/types/chat.types';

function parseFrame(frame: string): StreamEvent | null {
  const lines = frame.split('\n');
  const evLine = lines.find((l) => l.startsWith('event:'));
  const dataLine = lines.find((l) => l.startsWith('data:'));
  if (!evLine || !dataLine) return null;
  try {
    return { type: evLine.slice(6).trim(), data: JSON.parse(dataLine.slice(5).trim()) } as StreamEvent;
  } catch {
    return null;
  }
}

/**
 * Streams the assistant reply over a POST via fetch() + ReadableStream (never
 * EventSource — CLAUDE.md §2). Stop = AbortController.abort() (the backend then
 * saves the partial). Branches on 401 (silent refresh) and 429 (usage limit)
 * before reading the stream.
 */
export function useStreamChat() {
  const abortRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const send = useCallback(async (conversationId: string, content: string) => {
    const store = useChatStore.getState();
    store.setLimitError(null);
    store.pushMessage({ id: `u-${Date.now()}`, role: 'user', content });
    const tempId = `a-${Date.now()}`;
    store.pushMessage({ id: tempId, role: 'assistant', content: '', streaming: true });

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    const doFetch = (token: string | null) =>
      fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ content }),
        signal: controller.signal,
      });

    try {
      let res = await doFetch(useAuthStore.getState().accessToken);

      if (res.status === 401) {
        const ok = await trySilentRefresh();
        if (ok) {
          res = await doFetch(useAuthStore.getState().accessToken);
        } else {
          useAuthStore.getState().clear();
          window.location.assign('/login');
          return;
        }
      }

      // Pre-flight usage guard returns 429 JSON (not a stream) — surface it (6.4 UI).
      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        useChatStore.getState().setLimitError({ message: (body as { message?: string }).message ?? 'Usage limit reached.', resetAt: (body as { resetAt?: string }).resetAt });
        useChatStore.getState().removeMessage(tempId);
        return;
      }

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? 'Request failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const ev = parseFrame(frame);
          if (!ev) continue;
          const s = useChatStore.getState();
          switch (ev.type) {
            case 'token':
              s.patchMessage(tempId, (m) => ({ content: m.content + ev.data.content }));
              break;
            case 'tool_call':
              s.patchMessage(tempId, (m) => ({ toolCalls: [...(m.toolCalls ?? []), ev.data] }));
              break;
            case 'tool_result':
              s.patchMessage(tempId, (m) => ({ toolResults: [...(m.toolResults ?? []), ev.data] }));
              break;
            case 'usage':
              s.patchMessage(tempId, { cost: ev.data.cost });
              break;
            case 'done':
              s.patchMessage(tempId, { streaming: false, messageId: ev.data.messageId });
              break;
            case 'error':
              s.patchMessage(tempId, { streaming: false, error: ev.data.message });
              break;
          }
        }
      }
      // Stream ended (normal close) without a done event → clear the streaming flag.
      useChatStore.getState().patchMessage(tempId, (m) => (m.streaming ? { streaming: false } : {}));
    } catch (err) {
      const s = useChatStore.getState();
      if (controller.signal.aborted) {
        // User hit Stop — the backend persisted a partial; reflect it in the UI.
        s.patchMessage(tempId, { streaming: false, isPartial: true });
      } else {
        s.patchMessage(tempId, { streaming: false, error: err instanceof Error ? err.message : 'Stream failed' });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, []);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return { send, stop, isStreaming };
}
