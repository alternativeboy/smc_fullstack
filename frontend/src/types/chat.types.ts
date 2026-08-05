export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToolCall {
  name: string;
  arguments: string; // the generated SQL
}
export interface ToolResult {
  query: string;
  rows?: unknown[]; // present live; not persisted with rows
  rowCount: number;
  truncated?: boolean;
}

/**
 * FR-030 — which part of the turn we are waiting on, derived from the stream
 * events themselves. The backend emits `tool_call` only once the SQL arguments
 * are fully accumulated (llm.service.ts), so "deciding" and "writing the query"
 * are one indistinguishable wait from here; they share the 'thinking' phase.
 */
export type StreamPhase = 'thinking' | 'querying' | 'composing';

// Client-side message (covers both loaded history and the in-flight stream).
export interface ChatMessage {
  id: string; // real id (history) or a temp id (streaming)
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  cost?: number;
  isPartial?: boolean;
  streaming?: boolean;
  error?: string;
  messageId?: string; // real id assigned by the backend on `done`
  createdAt?: string;
  phase?: StreamPhase; // FR-030 — live only
  startedAt?: number; // FR-030 — epoch ms, for the elapsed counter (live only)
  prompt?: string; // FR-030 — the question that produced this turn, for retry (live only)
}

export interface ConversationDetail extends Conversation {
  messages: Array<Omit<ChatMessage, 'streaming' | 'error' | 'messageId'> & { content: string | null }>;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
}

// SSE events emitted by POST /conversations/:id/messages.
export type StreamEvent =
  | { type: 'token'; data: { content: string } }
  | { type: 'tool_call'; data: ToolCall }
  | { type: 'tool_result'; data: ToolResult }
  | { type: 'usage'; data: { promptTokens: number; completionTokens: number; cost: number } }
  | { type: 'done'; data: { messageId: string } }
  | { type: 'error'; data: { message: string } };
