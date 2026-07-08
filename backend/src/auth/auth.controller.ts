import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CookieOptions, Request, Response } from 'express';
import { Audit } from '../common/decorators/audit.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { AuthResult, AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const REFRESH_COOKIE = 'refreshToken';

type AuditableRequest = Request & { auditUserId?: string; auditMetadata?: Record<string, unknown> };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  // Brute-force protection on the credential-accepting routes (NFR-014/GAP-007).
  @Post('register')
  @UseGuards(ThrottlerGuard)
  @UseInterceptors(AuditInterceptor)
  @Audit('register', 'auth')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: AuditableRequest,
  ) {
    const result = await this.auth.register(dto);
    req.auditUserId = result.user.id;
    req.auditMetadata = { email: dto.email };
    return this.respond(res, result);
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @UseInterceptors(AuditInterceptor)
  @Audit('login', 'auth')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: AuditableRequest,
  ) {
    const result = await this.auth.login(dto);
    req.auditUserId = result.user.id;
    req.auditMetadata = { email: dto.email };
    return this.respond(res, result);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const presented = req.cookies?.[REFRESH_COOKIE];
    if (!presented) {
      throw new UnauthorizedException('Missing refresh token');
    }
    return this.respond(res, await this.auth.refresh(presented));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AuditInterceptor)
  @Audit('logout', 'auth')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  /** Set the refresh cookie and return the JSON body WITHOUT the refresh token. */
  private respond(res: Response, result: AuthResult) {
    const { refreshToken, ...body } = result;
    const ttl = this.config.getOrThrow<number>('REFRESH_TOKEN_TTL');
    res.cookie(REFRESH_COOKIE, refreshToken, { ...this.cookieOptions(), maxAge: ttl * 1000 });
    return body;
  }

  private cookieOptions(): CookieOptions {
    const cookie = this.config.getOrThrow<{
      secure: boolean;
      sameSite: 'strict' | 'lax' | 'none';
      path: string;
    }>('app.cookie');
    return {
      httpOnly: true,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: cookie.path,
    };
  }
}
