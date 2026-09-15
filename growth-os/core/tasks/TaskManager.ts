import type { AgentTask, TaskStatus } from '../types/index.js';

export class TaskManager {
  private tasks = new Map<string, AgentTask>();

  create(partial: Omit<AgentTask, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>): AgentTask {
    const task: AgentTask = {
      ...partial,
      id: crypto.randomUUID(),
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  get(id: string): AgentTask | undefined {
    return this.tasks.get(id);
  }

  updateStatus(id: string, status: TaskStatus, updates: Partial<AgentTask> = {}): AgentTask {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);
    const updated = { ...task, ...updates, status, updatedAt: new Date() };
    this.tasks.set(id, updated);
    return updated;
  }

  listByRun(runId: string): AgentTask[] {
    return Array.from(this.tasks.values()).filter(t => t.runId === runId);
  }

  listPending(businessId: string): AgentTask[] {
    return Array.from(this.tasks.values()).filter(
      t => t.businessId === businessId && t.status === 'pending'
    );
  }

  getStats(runId: string): { total: number; completed: number; failed: number; pending: number } {
    const tasks = this.listByRun(runId);
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      pending: tasks.filter(t => t.status === 'pending' || t.status === 'running').length,
    };
  }
}
