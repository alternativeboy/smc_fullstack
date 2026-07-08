import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { Response } from 'express';
import { Repository } from 'typeorm';
import { AuditService } from '../common/services/audit.service';
import { LlmService } from '../llm/llm.service';
import { ConversationTurn, StreamEvent } from '../llm/interfaces/stream-event.interface';
import { ChatService } from './chat.service';
import { Message } from './entities/message.entity';

interface StreamParams {
  conversationId: string;
  userId: string;
  userContent: string;
  res: Response;
  signal: AbortSignal;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    private readonly chat: ChatService,
    private readonly llm: LlmService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  /** Ownership gate (FR-014) — throws 404 for a foreign/unknown conversation. */
  assertOwned(userId: string, id: string) {
    return this.chat.assertOwned(userId, id);
  }

  /**
   * Save the user message, stream the assistant turn as SSE, persist the
   * assistant message (final or partial-on-abort) + a 'query' audit row. On an
   * OpenAI failure emits event:error; on client disconnect saves a partial.
   */
  async stream({ conversationId, userId, userContent, res, signal }: StreamParams): Promise<void> {
    const history = await this.buildHistory(conversationId); // prior turns (excludes the new msg)
    await this.saveUser(conversationId, userContent);

    let content = '';
    const toolCalls: unknown[] = [];
    const toolResults: Array<{ query: string; rowCount: number }> = [];
    let cost = 0;
    let promptTokens = 0;
    let completionTokens = 0;

    const gen = this.llm.streamChat(history, userContent, signal);
    try {
      let next = await gen.next();
      while (!next.done) {
        const event = next.value;
        switch (event.type) {
          case 'token':
            content += event.data.content;
            break;
          case 'tool_call':
            toolCalls.push(event.data);
            break;
          case 'tool_result':
            toolResults.push({ query: event.data.query, rowCount: event.data.rowCount });
            break;
          case 'usage':
            cost = event.data.cost;
            promptTokens = event.data.promptTokens;
            completionTokens = event.data.completionTokens;
            break;
        }
        this.write(res, event);
        next = await gen.next();
      }

      const saved = await this.saveAssistant(conversationId, {
        content,
        toolCalls,
        toolResults,
        promptTokens,
        completionTokens,
        cost,
        isPartial: false,
      });
      await this.writeAudit(userId, toolResults, cost, false);
      this.write(res, { type: 'done', data: { messageId: saved.id } });
    } catch (err) {
      if (signal.aborted) {
        // Client disconnected mid-stream (FR-016/017 groundwork; full verify in Phase 5).
        this.logger.warn(`Stream aborted (conversation ${conversationId}); saving partial`);
        await this.saveAssistant(conversationId, {
          content,
          toolCalls,
          toolResults,
          promptTokens,
          completionTokens,
          cost,
          isPartial: true,
        });
        await this.writeAudit(userId, toolResults, cost, true);
      } else {
        // OpenAI/pipeline failure (GAP-005) — never crash; tell the client cleanly.
        this.logger.error(`LLM stream failed: ${err instanceof Error ? err.message : String(err)}`);
        this.write(res, {
          type: 'error',
          data: { message: 'The assistant is temporarily unavailable. Please try again.' },
        });
      }
    }
  }

  private async buildHistory(conversationId: string): Promise<ConversationTurn[]> {
    const rows = await this.messages.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
    return rows
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content as string }));
  }

  private saveUser(conversationId: string, content: string): Promise<Message> {
    return this.messages.save(this.messages.create({ conversationId, role: 'user', content }));
  }

  private saveAssistant(
    conversationId: string,
    m: {
      content: string;
      toolCalls: unknown[];
      toolResults: unknown[];
      promptTokens: number;
      completionTokens: number;
      cost: number;
      isPartial: boolean;
    },
  ): Promise<Message> {
    return this.messages.save(
      this.messages.create({
        conversationId,
        role: 'assistant',
        content: m.content || null,
        toolCalls: m.toolCalls.length ? m.toolCalls : null,
        toolResults: m.toolResults.length ? m.toolResults : null,
        promptTokens: m.promptTokens,
        completionTokens: m.completionTokens,
        cost: m.cost.toString(),
        isPartial: m.isPartial,
      }),
    );
  }

  private writeAudit(
    userId: string,
    toolResults: Array<{ query: string; rowCount: number }>,
    cost: number,
    isPartial: boolean,
  ) {
    return this.audit.log({
      userId,
      action: 'query',
      resource: 'financial_data',
      metadata: {
        sql: toolResults.map((t) => t.query),
        results_count: toolResults.reduce((n, t) => n + (t.rowCount ?? 0), 0),
        model: this.config.getOrThrow<string>('OPENAI_MODEL'),
        cost,
        is_partial: isPartial,
      },
    });
  }

  private write(res: Response, event: StreamEvent): void {
    if (res.writableEnded) return;
    res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
  }
}
