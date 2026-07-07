import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

export interface AuditMeta {
  action: string;
  resource: string;
}

/**
 * Declaratively mark a route for auditing. AuditInterceptor writes an audit_logs
 * row after the handler succeeds. Handlers may enrich the row by setting
 * `req.auditMetadata = {...}` (e.g. messageCount).
 */
export const Audit = (action: string, resource: string) =>
  SetMetadata(AUDIT_KEY, { action, resource } satisfies AuditMeta);
