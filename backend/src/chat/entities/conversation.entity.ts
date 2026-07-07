import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { Message } from './message.entity';

/**
 * conversations — FR-001, FR-014, FR-018, FR-019, FR-020 (erd.md §2).
 * Soft-deleted via deleted_at (CLAUDE.md §2 / CR-007). Owned by a user; every
 * query is scoped by user_id (FR-014). FK cascade is a DB safety net, not the
 * delete mechanism.
 */
@Entity('conversations')
@Index('idx_conversations_user_id', ['userId'])
@Index('idx_conversations_updated_at', ['updatedAt'])
export class Conversation extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255, default: 'New Chat' })
  title: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];
}
