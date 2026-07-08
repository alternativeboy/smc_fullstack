import { Module } from '@nestjs/common';
import { UsageLimitGuard } from './guards/usage-limit.guard';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

// RedisModule (REDIS_CLIENT) and ConfigModule are global, so no imports needed.
@Module({
  controllers: [UsageController],
  providers: [UsageService, UsageLimitGuard],
  exports: [UsageService, UsageLimitGuard],
})
export class UsageModule {}
