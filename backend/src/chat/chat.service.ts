import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

// Response shapes per openapi (no user_id / deleted_at leaked).
interface ConversationDto {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}
interface MessageDto {
  id: string;
  role: string;
  content: string | null;
  toolCalls: unknown | null;
  toolResults: unknown | null;
  cost: number;
  isPartial: boolean;
  createdAt: Date;
}

const toConversation = (c: Conversation): ConversationDto => ({
  id: c.id,
  title: c.title,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

const toMessage = (m: Message): MessageDto => ({
  id: m.id,
  role: m.role,
  content: m.content,
  toolCalls: m.toolCalls ?? null,
  toolResults: m.toolResults ?? null,
  cost: Number(m.cost),
  isPartial: m.isPartial,
  createdAt: m.createdAt,
});

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation) private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
  ) {}

  async list(userId: string, page: number, limit: number) {
    // where { userId } excludes soft-deleted rows automatically (@DeleteDateColumn).
    const [rows, total] = await this.conversations.findAndCount({
      where: { userId },
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: rows.map(toConversation), total, page };
  }

  async create(userId: string): Promise<ConversationDto> {
    const saved = await this.conversations.save(this.conversations.create({ userId }));
    return toConversation(saved);
  }

  async getOne(userId: string, id: string) {
    const conversation = await this.findOwned(userId, id);
    const messages = await this.orderedMessages(id);
    return { ...toConversation(conversation), messages: messages.map(toMessage) };
  }

  async getMessages(userId: string, id: string): Promise<MessageDto[]> {
    await this.findOwned(userId, id); // ownership check → 404
    return (await this.orderedMessages(id)).map(toMessage);
  }

  async softDelete(userId: string, id: string): Promise<{ message: string; messageCount: number }> {
    const conversation = await this.findOwned(userId, id);
    // Count before soft-remove for the audit metadata; messages are RETAINED
    // (soft-delete keeps history — the conversation is just hidden).
    const messageCount = await this.messages.count({ where: { conversationId: id } });
    await this.conversations.softRemove(conversation);
    return { message: 'Conversation deleted successfully', messageCount };
  }

  /**
   * The single choke point for FR-014: scope by user_id AND id. A foreign or
   * non-existent (or soft-deleted) id yields null → 404 — never another user's data.
   */
  private async findOwned(userId: string, id: string): Promise<Conversation> {
    const conversation = await this.conversations.findOne({ where: { id, userId } });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  private orderedMessages(conversationId: string): Promise<Message[]> {
    return this.messages.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }
}
