import { Injectable } from '@nestjs/common';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { SYSTEM_PROMPT } from '../constants/system-prompt';
import { ConversationTurn } from '../interfaces/stream-event.interface';

@Injectable()
export class PromptBuilderService {
  /** system prompt + prior turns + the new user message. */
  build(history: ConversationTurn[], userMessage: string): ChatCompletionMessageParam[] {
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(
        (turn): ChatCompletionMessageParam => ({ role: turn.role, content: turn.content }),
      ),
      { role: 'user', content: userMessage },
    ];
  }
}
