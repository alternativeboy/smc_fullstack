import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

/**
 * @CurrentUser() — pulls the authenticated user that JwtStrategy.validate()
 * attached to the request. Guard the route with JwtAuthGuard first.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest().user,
);
