import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { FinancialService } from '../financial/financial.service';
import { EXECUTE_SQL_TOOL } from './constants/tool-definitions';
import { ConversationTurn, StreamEvent, StreamResult } from './interfaces/stream-event.interface';
import { OPENAI_CLIENT } from './llm.constants';
import { calculateCost } from './services/cost';
import { OutputValidatorService } from './services/output-validator.service';
import { PromptBuilderService } from './services/prompt-builder.service';

// Bound the tool loop so a misbehaving model can't spin forever.
const MAX_TOOL_ROUNDS = 5;

interface ToolCallAcc {
  id: string;
  name: string;
  arguments: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly model: string;

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI,
    private readonly config: ConfigService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly financial: FinancialService,
    private readonly outputValidator: OutputValidatorService,
  ) {
    this.model = this.config.getOrThrow<string>('OPENAI_MODEL');
  }

  /**
   * Streams the assistant turn. Yields SSE StreamEvents (token/tool_call/
   * tool_result/usage) and returns the assembled StreamResult for persistence.
   * The tool loop: stream → on tool_calls, run each execute_sql via
   * FinancialService (Layer 2 + Layer 3) → feed results back → continue.
   */
  async *streamChat(
    history: ConversationTurn[],
    userMessage: string,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamEvent, StreamResult, void> {
    const messages = this.promptBuilder.build(history, userMessage);
    let content = '';
    let promptTokens = 0;
    let completionTokens = 0;
    const toolCalls: unknown[] = [];
    const toolResults: unknown[] = [];
    let lastRows: unknown[] = [];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const stream = await this.openai.chat.completions.create(
        {
          model: this.model,
          messages,
          tools: [EXECUTE_SQL_TOOL],
          stream: true,
          stream_options: { include_usage: true },
        },
        { signal }, // aborts the HTTP request when the client disconnects
      );

      let roundContent = '';
      const acc: Record<number, ToolCallAcc> = {};
      let finishReason: string | null = null;

      for await (const chunk of stream) {
        if (chunk.usage) {
          promptTokens += chunk.usage.prompt_tokens ?? 0;
          completionTokens += chunk.usage.completion_tokens ?? 0;
        }
        const choice = chunk.choices?.[0];
        if (!choice) continue;
        const delta = choice.delta;
        if (delta?.content) {
          roundContent += delta.content;
          content += delta.content;
          yield { type: 'token', data: { content: delta.content } };
        }
        for (const tc of delta?.tool_calls ?? []) {
          const entry = (acc[tc.index] ??= { id: '', name: '', arguments: '' });
          if (tc.id) entry.id = tc.id;
          if (tc.function?.name) entry.name = tc.function.name;
          if (tc.function?.arguments) entry.arguments += tc.function.arguments;
        }
        if (choice.finish_reason) finishReason = choice.finish_reason;
      }

      const rounds = Object.values(acc);
      if (finishReason === 'tool_calls' && rounds.length > 0) {
        messages.push({
          role: 'assistant',
          content: roundContent || null,
          tool_calls: rounds.map((t) => ({
            id: t.id,
            type: 'function',
            function: { name: t.name, arguments: t.arguments },
          })),
        } as ChatCompletionMessageParam);

        for (const tc of rounds) {
          const sql = this.parseQuery(tc.arguments);
          toolCalls.push({ name: tc.name, arguments: sql });
          yield { type: 'tool_call', data: { name: tc.name, arguments: sql } };

          let toolContent: string;
          try {
            const result = await this.financial.execute(sql);
            lastRows = result.rows;
            toolResults.push({ query: sql, rowCount: result.rowCount });
            yield {
              type: 'tool_result',
              data: {
                query: sql,
                rows: result.rows,
                rowCount: result.rowCount,
                truncated: result.truncated,
              },
            };
            toolContent = JSON.stringify(result.rows);
          } catch (err) {
            // Validator rejection (Layer 2) or DB error → feed back so the model
            // can reformulate. The loop never crashes.
            const message = this.errorMessage(err);
            toolResults.push({ query: sql, error: message });
            yield { type: 'tool_result', data: { query: sql, rows: [], rowCount: 0, truncated: false } };
            toolContent = JSON.stringify({ error: message });
          }

          messages.push({ role: 'tool', tool_call_id: tc.id, content: toolContent });
        }
        continue; // re-prompt the model with the tool results
      }

      // Final answer.
      const cost = calculateCost(promptTokens, completionTokens);
      const outcome = this.outputValidator.validate(content, lastRows);
      if (!outcome.valid) {
        this.logger.warn(`Output validator: ${outcome.warnings.join('; ')}`);
      }
      yield { type: 'usage', data: { promptTokens, completionTokens, cost } };
      return { content, promptTokens, completionTokens, cost, toolCalls, toolResults };
    }

    // Tool-loop budget exhausted — return what we have.
    this.logger.warn(`Tool loop hit MAX_TOOL_ROUNDS (${MAX_TOOL_ROUNDS})`);
    const cost = calculateCost(promptTokens, completionTokens);
    yield { type: 'usage', data: { promptTokens, completionTokens, cost } };
    return { content, promptTokens, completionTokens, cost, toolCalls, toolResults };
  }

  private parseQuery(args: string): string {
    try {
      return (JSON.parse(args)?.query as string) ?? '';
    } catch {
      return '';
    }
  }

  private errorMessage(err: unknown): string {
    if (err instanceof BadRequestException) {
      const res = err.getResponse() as { errors?: string[]; message?: string };
      return res.errors?.join('; ') ?? res.message ?? 'Query rejected';
    }
    return err instanceof Error ? err.message : 'Query execution failed';
  }
}
