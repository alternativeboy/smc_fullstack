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

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
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
    return this.buildResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    // password_hash is select:false, so request it explicitly for the compare.
    const user = await this.users.findOne({
      where: { email: dto.email },
      select: { id: true, email: true, displayName: true, passwordHash: true },
    });
    // Same 401 for unknown email and wrong password — don't reveal which failed.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.buildResponse(user);
  }

  private buildResponse(user: User): AuthResponse {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email });
    const { exp, iat } = this.jwt.decode(accessToken) as { exp: number; iat: number };
    return {
      accessToken,
      expiresIn: exp - iat,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    };
  }
}
