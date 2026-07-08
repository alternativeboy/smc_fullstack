// SSE event shapes — mirror the OpenAPI POST /messages event table.
export type StreamEvent =
  | { type: 'token'; data: { content: string } }
  | { type: 'tool_call'; data: { name: string; arguments: string } }
  | { type: 'tool_result'; data: { query: string; rows: unknown[]; rowCount: number; truncated: boolean } }
  | { type: 'usage'; data: { promptTokens: number; completionTokens: number; cost: number } }
  | { type: 'done'; data: { messageId: string } }
  | { type: 'error'; data: { message: string } };

// The generator's return value — everything the caller needs to persist the
// assistant message (Phase 4b.2).
export interface StreamResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  toolCalls: unknown[];
  toolResults: unknown[];
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}
