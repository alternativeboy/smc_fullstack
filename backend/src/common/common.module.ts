import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { AuditService } from './services/audit.service';

/**
 * Shared cross-cutting concerns (audit trail). Global so any feature module can
 * @UseInterceptors(AuditInterceptor) / inject AuditService without re-importing.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class CommonModule {}
