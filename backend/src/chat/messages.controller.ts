import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { UsageLimitGuard } from '../usage/guards/usage-limit.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagesService } from './messages.service';

// JwtAuthGuard first (sets req.user), then the pre-flight usage check (FR-021).
@Controller('conversations/:id/messages')
@UseGuards(JwtAuthGuard, UsageLimitGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  /**
   * FR-004/005 — send a message and stream the AI response as SSE over this POST
   * (fetch()+ReadableStream on the client). @Res() is used to write the stream and
   * observe req 'close' for aborts. Ownership is checked BEFORE any SSE header, so
   * a foreign id returns a normal 404 (FR-014).
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async send(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMessageDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.messages.assertOwned(user.id, id); // throws 404 before streaming

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    (res as Response & { flushHeaders?: () => void }).flushHeaders?.();

    const abort = new AbortController();
    let finished = false;
    req.on('close', () => {
      if (!finished) abort.abort();
    });

    await this.messages.stream({
      conversationId: id,
      userId: user.id,
      userContent: dto.content,
      res,
      signal: abort.signal,
    });

    finished = true;
    if (!res.writableEnded) res.end();
  }
}
