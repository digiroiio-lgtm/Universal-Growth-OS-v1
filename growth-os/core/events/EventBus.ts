import type { GrowthEvent, GrowthEventType } from '../types/index.js';

type EventHandler = (event: GrowthEvent) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<string, EventHandler[]>();
  private wildcardHandlers: EventHandler[] = [];

  on(eventType: GrowthEventType | '*', handler: EventHandler): void {
    if (eventType === '*') {
      this.wildcardHandlers.push(handler);
      return;
    }
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...existing, handler]);
  }

  off(eventType: GrowthEventType | '*', handler: EventHandler): void {
    if (eventType === '*') {
      this.wildcardHandlers = this.wildcardHandlers.filter(h => h !== handler);
      return;
    }
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, existing.filter(h => h !== handler));
  }

  async emit(event: GrowthEvent): Promise<void> {
    const typed = this.handlers.get(event.type) ?? [];
    const all = [...typed, ...this.wildcardHandlers];
    await Promise.all(all.map(h => h(event)));
  }

  static createEvent(
    partial: Omit<GrowthEvent, 'id' | 'timestamp'>
  ): GrowthEvent {
    return {
      ...partial,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
  }
}
