import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

describe('ChatService (FR-014 ownership scoping)', () => {
  let service: ChatService;
  const conversations = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
  };
  const messages = { find: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(Conversation), useValue: conversations },
        { provide: getRepositoryToken(Message), useValue: messages },
      ],
    }).compile();
    service = moduleRef.get(ChatService);
  });

  it('list scopes by userId, sorts updated_at DESC, paginates', async () => {
    conversations.findAndCount.mockResolvedValue([[{ id: 'c1', title: 'x' }], 1]);
    const res = await service.list('user-1', 2, 20);
    expect(conversations.findAndCount).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      order: { updatedAt: 'DESC' },
      skip: 20,
      take: 20,
    });
    expect(res).toEqual({ data: [{ id: 'c1', title: 'x', createdAt: undefined, updatedAt: undefined }], total: 1, page: 2 });
  });

  it('getOne throws 404 when the conversation is not owned / not found', async () => {
    conversations.findOne.mockResolvedValue(null);
    await expect(service.getOne('user-1', 'c-x')).rejects.toBeInstanceOf(NotFoundException);
    expect(conversations.findOne).toHaveBeenCalledWith({ where: { id: 'c-x', userId: 'user-1' } });
  });

  it('getMessages enforces ownership before returning messages', async () => {
    conversations.findOne.mockResolvedValue(null);
    await expect(service.getMessages('user-1', 'c-x')).rejects.toBeInstanceOf(NotFoundException);
    expect(messages.find).not.toHaveBeenCalled();
  });

  it('softDelete throws 404 for a foreign id and never removes', async () => {
    conversations.findOne.mockResolvedValue(null);
    await expect(service.softDelete('user-1', 'c-foreign')).rejects.toBeInstanceOf(NotFoundException);
    expect(conversations.softRemove).not.toHaveBeenCalled();
  });

  it('softDelete removes an owned conversation and returns the message', async () => {
    const conv = { id: 'c1', userId: 'user-1' };
    conversations.findOne.mockResolvedValue(conv);
    const res = await service.softDelete('user-1', 'c1');
    expect(conversations.softRemove).toHaveBeenCalledWith(conv);
    expect(res).toEqual({ message: 'Conversation deleted successfully' });
  });
});
