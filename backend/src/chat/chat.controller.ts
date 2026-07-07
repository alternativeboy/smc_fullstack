import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Audit } from '../common/decorators/audit.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ChatService } from './chat.service';
import { ListConversationsQueryDto } from './dto/list-conversations.query.dto';

type AuditableRequest = Request & { auditMetadata?: Record<string, unknown> };

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListConversationsQueryDto) {
    return this.chat.list(user.id, query.page, query.limit);
  }

  @Post()
  create(@CurrentUser() user: AuthUser) {
    return this.chat.create(user.id);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.chat.getOne(user.id, id);
  }

  @Get(':id/messages')
  getMessages(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.chat.getMessages(user.id, id);
  }

  @Delete(':id')
  @UseInterceptors(AuditInterceptor)
  @Audit('delete_conversation', 'conversation')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuditableRequest,
  ) {
    // Ownership is enforced in the service: a foreign id throws 404 here, so the
    // interceptor's success tap never fires → no audit row for a failed delete.
    const { message, messageCount } = await this.chat.softDelete(user.id, id);
    req.auditMetadata = { conversationId: id, messageCount };
    return { message };
  }
}
