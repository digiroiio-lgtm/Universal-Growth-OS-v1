import type { ApprovalItem, ApprovalStatus, ApprovalType } from '../types/index.js';
import { EventBus } from '../events/EventBus.js';

export class ApprovalQueue {
  private items = new Map<string, ApprovalItem>();

  constructor(private readonly events: EventBus) {}

  enqueue(
    partial: Omit<ApprovalItem, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ): ApprovalItem {
    const item: ApprovalItem = {
      ...partial,
      id: crypto.randomUUID(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.set(item.id, item);

    this.events.emit(
      EventBus.createEvent({
        businessId: item.businessId,
        type: 'approval.requested',
        source: 'approval_queue',
        data: { approvalId: item.id, type: item.type, summary: item.summary },
      })
    );

    return item;
  }

  async review(
    id: string,
    decision: 'approved' | 'rejected',
    reviewedBy: string,
    note?: string
  ): Promise<ApprovalItem> {
    const item = this.items.get(id);
    if (!item) throw new Error(`Approval item not found: ${id}`);
    if (item.status !== 'pending') throw new Error(`Item ${id} is not pending (${item.status})`);

    const updated: ApprovalItem = {
      ...item,
      status: decision,
      reviewedBy,
      reviewNote: note,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.set(id, updated);

    await this.events.emit(
      EventBus.createEvent({
        businessId: item.businessId,
        type: decision === 'approved' ? 'approval.granted' : 'approval.denied',
        source: 'approval_queue',
        data: { approvalId: id, reviewedBy, note },
      })
    );

    return updated;
  }

  get(id: string): ApprovalItem | undefined {
    return this.items.get(id);
  }

  listPending(businessId: string, type?: ApprovalType): ApprovalItem[] {
    return Array.from(this.items.values()).filter(
      item =>
        item.businessId === businessId &&
        item.status === 'pending' &&
        (!type || item.type === type)
    );
  }

  expireStale(): void {
    const now = new Date();
    for (const item of this.items.values()) {
      if (item.status === 'pending' && item.expiresAt && item.expiresAt < now) {
        this.items.set(item.id, { ...item, status: 'expired', updatedAt: new Date() });
      }
    }
  }
}
