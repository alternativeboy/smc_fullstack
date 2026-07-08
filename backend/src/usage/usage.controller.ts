import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { UsageStatus } from './interfaces/usage-status.interface';
import { UsageService } from './usage.service';

@Controller('usage')
@UseGuards(JwtAuthGuard)
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @Get('status')
  status(@CurrentUser() user: AuthUser): Promise<UsageStatus> {
    return this.usage.getStatus(user.id);
  }
}
