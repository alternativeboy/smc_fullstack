import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  resource: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  durationMs?: number | null;
  statusCode?: number | null;
}

/**
 * Append-only writer for audit_logs (CR-002/018, SOX §802). This is the ONLY
 * write path to the table and it exposes INSERT only — there is deliberately no
 * update/delete/remove method, so no code path can mutate the trail.
 */
@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.auditLogs.insert({
      userId: entry.userId ?? null,
      action: entry.action,
      resource: entry.resource,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TypeORM's
      // QueryDeepPartialEntity doesn't handle a jsonb Record cleanly.
      metadata: (entry.metadata ?? null) as any,
      ipAddress: entry.ipAddress ?? null,
      durationMs: entry.durationMs ?? null,
      statusCode: entry.statusCode ?? null,
    });
  }
}
