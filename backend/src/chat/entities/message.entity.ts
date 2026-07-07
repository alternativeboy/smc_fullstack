import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

/**
 * messages — FR-004, FR-005, FR-016, FR-017, NFR-007/008 (erd.md §3).
 * created_at only (no updated_at), so this does NOT extend BaseEntity. Ordered
 * by created_at ASC for correct history (NFR-008).
 */
@Entity('messages')
@Index('idx_messages_conversation_id', ['conversationId'])
@Index('idx_messages_created_at', ['createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ type: 'varchar', length: 20 })
  role: string;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ name: 'tool_calls', type: 'jsonb', nullable: true })
  toolCalls: unknown | null;

  @Column({ name: 'tool_results', type: 'jsonb', nullable: true })
  toolResults: unknown | null;

  @Column({ name: 'prompt_tokens', type: 'integer', default: 0 })
  promptTokens: number;

  @Column({ name: 'completion_tokens', type: 'integer', default: 0 })
  completionTokens: number;

  // pg returns numeric as string to preserve precision; keep as string here.
  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  cost: string;

  @Column({ name: 'is_partial', type: 'boolean', default: false })
  isPartial: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
