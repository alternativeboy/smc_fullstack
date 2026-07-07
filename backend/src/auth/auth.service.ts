import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from './entities/user.entity';
import { RefreshTokenService } from './services/refresh-token.service';

export interface AuthResult {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
  // Set as the httpOnly refresh cookie by the controller — NEVER in the JSON body.
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const cost = this.config.getOrThrow<number>('BCRYPT_COST');
    const passwordHash = await bcrypt.hash(dto.password, cost);
    const entity = this.users.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
    });
    const user = await this.users.save(entity);
    return this.issueFor(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    // password_hash is select:false, so request it explicitly for the compare.
    const user = await this.users.findOne({
      where: { email: dto.email },
      select: { id: true, email: true, displayName: true, passwordHash: true },
    });
    // Same 401 for unknown email and wrong password — don't reveal which failed.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueFor(user);
  }

  async refresh(presentedToken: string): Promise<AuthResult> {
    const { userId, token: refreshToken } = await this.refreshTokens.rotate(presentedToken);
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.buildAccess(user, refreshToken);
  }

  async logout(presentedToken?: string): Promise<void> {
    if (presentedToken) {
      await this.refreshTokens.revoke(presentedToken);
    }
  }

  private async issueFor(user: User): Promise<AuthResult> {
    const refreshToken = await this.refreshTokens.issue(user.id);
    return this.buildAccess(user, refreshToken);
  }

  private buildAccess(user: User, refreshToken: string): AuthResult {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email });
    const { exp, iat } = this.jwt.decode(accessToken) as { exp: number; iat: number };
    return {
      accessToken,
      expiresIn: exp - iat,
      user: { id: user.id, email: user.email, displayName: user.displayName },
      refreshToken,
    };
  }
}
