import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from './config/config.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { CommonModule } from './common/common.module';
import { FinancialModule } from './financial/financial.module';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.user'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        autoLoadEntities: true,
        synchronize: false, // never — migrations only (CLAUDE.md §2)
        extra: { max: config.get<number>('database.poolSize') },
      }),
    }),
    RedisModule,
    CommonModule,
    HealthModule,
    AuthModule,
    ChatModule,
    FinancialModule,
  ],
})
export class AppModule {}
