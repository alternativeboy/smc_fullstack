import { AuditService } from './audit.service';

describe('AuditService (append-only — CR-002/018)', () => {
  it('writes via repository.insert only', async () => {
    const repo = { insert: jest.fn() };
    const service = new AuditService(repo as any);
    await service.log({
      userId: 'u1',
      action: 'delete_conversation',
      resource: 'conversation',
      metadata: { conversationId: 'c1', messageCount: 2 },
    });
    expect(repo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        action: 'delete_conversation',
        resource: 'conversation',
        metadata: { conversationId: 'c1', messageCount: 2 },
      }),
    );
  });

  it('exposes no update/delete/remove/save path (immutable trail)', () => {
    const service = new AuditService({} as any) as unknown as Record<string, unknown>;
    expect(service.update).toBeUndefined();
    expect(service.delete).toBeUndefined();
    expect(service.remove).toBeUndefined();
    expect(service.save).toBeUndefined();
  });
});
