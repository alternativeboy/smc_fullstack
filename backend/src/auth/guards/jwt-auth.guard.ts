import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protects routes with the Bearer access token (JwtStrategy). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
