import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AUDIT_KEY, AuditMeta } from '../decorators/audit.decorator';
import { AuditService } from '../services/audit.service';

/**
 * Writes an audit_logs row after an @Audit()-decorated handler succeeds. On
 * error (e.g. a 404 for a foreign id) the tap does not fire, so no row is
 * written. Reusable for later phases (query, login, etc.).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta | undefined>(AUDIT_KEY, context.getHandler());
    if (!meta) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        void this.audit.log({
          // req.user on guarded routes; req.auditUserId lets auth handlers
          // (login/register) attach the id since they run before a JWT exists.
          userId: req.user?.id ?? req.auditUserId ?? null,
          action: meta.action,
          resource: meta.resource,
          metadata: req.auditMetadata ?? null,
          ipAddress: req.ip ?? null,
          durationMs: Date.now() - start,
          statusCode: res.statusCode ?? null,
        });
      }),
    );
  }
}
