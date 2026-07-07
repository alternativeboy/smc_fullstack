import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { RefreshTokenService } from './services/refresh-token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    // Rate limiting for auth routes (NFR-014 / GAP-007). v6: ttl is milliseconds.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.getOrThrow<number>('THROTTLE_TTL') * 1000,
          limit: config.getOrThrow<number>('THROTTLE_LIMIT'),
        },
      ],
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_ACCESS_EXPIRES') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
