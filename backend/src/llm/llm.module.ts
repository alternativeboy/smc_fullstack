import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { FinancialModule } from '../financial/financial.module';
import { LlmService } from './llm.service';
import { OPENAI_CLIENT } from './llm.constants';
import { OutputValidatorService } from './services/output-validator.service';
import { PromptBuilderService } from './services/prompt-builder.service';

@Module({
  imports: [FinancialModule], // reuses SqlValidatorService + FinancialService (Layer 2 + 3)
  providers: [
    {
      provide: OPENAI_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new OpenAI({ apiKey: config.getOrThrow<string>('OPENAI_API_KEY') }),
    },
    LlmService,
    PromptBuilderService,
    OutputValidatorService,
  ],
  exports: [LlmService],
})
export class LlmModule {}
