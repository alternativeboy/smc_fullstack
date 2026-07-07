import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * audit_logs — CR-002, CR-018, GAP-008 (erd.md §5). APPEND-ONLY: no code path
 * ever UPDATEs or DELETEs a row (SOX §802 immutable trail). created_at only, so
 * this does NOT extend BaseEntity. user_id is nullable for system-level events.
 */
@Entity('audit_logs')
@Index('idx_audit_user_id', ['userId'])
@Index('idx_audit_action', ['action'])
@Index('idx_audit_created_at', ['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'varchar', length: 50 })
  resource: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs: number | null;

  @Column({ name: 'status_code', type: 'integer', nullable: true })
  statusCode: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
