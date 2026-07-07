import { Column, DeleteDateColumn, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/**
 * users — FR-012, FR-013, FR-014 (per erd.md §1).
 * `password_hash` uses select:false so it is never loaded/serialized by default
 * (CLAUDE.md §3 rule 5 / GAP-003). Soft-delete via deleted_at (CR-007).
 */
@Entity('users')
@Index('idx_users_email', ['email'], { unique: true })
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
