import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UsageService } from '../usage.service';

/**
 * Pre-flight spend check (FR-021) — runs AFTER JwtAuthGuard (needs req.user).
 * If the user is out of budget, throws a friendly 429 (UsageLimitError body with
 * resetAt) BEFORE any OpenAI call or SSE stream begins.
 */
@Injectable()
export class UsageLimitGuard implements CanActivate {
  constructor(private readonly usage: UsageService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const status = await this.usage.getStatus(req.user.id);
    if (status.remaining <= 0) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Usage Limit Exceeded',
          message:
            `You've reached your spending limit of $${status.limit.toFixed(2)}. ` +
            `It will reset at ${status.resetAt}.`,
          resetAt: status.resetAt,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
