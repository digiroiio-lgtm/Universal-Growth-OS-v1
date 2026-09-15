import type {
  AgentDefinition,
  AgentRun,
  AgentRunOutput,
  AgentState,
  Entity,
  GrowthEvent,
  Opportunity,
  Action,
  RunTrigger,
} from '../types/index.js';
import { EventBus } from '../events/EventBus.js';
import { TaskManager } from '../tasks/TaskManager.js';
import { MetricsCollector } from '../metrics/MetricsCollector.js';

export interface AgentContext {
  events: EventBus;
  tasks: TaskManager;
  metrics: MetricsCollector;
}

export abstract class BaseAgent {
  protected run!: AgentRun;
  protected state!: AgentState;

  constructor(
    protected readonly definition: AgentDefinition,
    protected readonly ctx: AgentContext
  ) {}

  get id(): string {
    return this.definition.id;
  }

  get businessId(): string {
    return this.definition.businessId;
  }

  get config(): AgentDefinition['config'] {
    return this.definition.config;
  }

  async execute(trigger: RunTrigger = 'manual', input: Record<string, unknown> = {}): Promise<AgentRun> {
    this.run = this.initRun(trigger, input);
    this.state = this.initState();

    await this.ctx.events.emit(
      EventBus.createEvent({
        businessId: this.businessId,
        type: 'agent.run.started',
        source: this.id,
        agentId: this.id,
        runId: this.run.id,
        data: { trigger, input },
      })
    );

    try {
      const output = await this.run_impl();
      this.run = {
        ...this.run,
        status: 'completed',
        output,
        entitiesDiscovered: output.entities.length,
        entitiesActioned: output.actions.length,
        completedAt: new Date(),
      };

      this.ctx.metrics.increment(this.businessId, 'agent.runs.completed', 1, { agentId: this.id }, this.id);
      this.ctx.metrics.increment(this.businessId, 'entities.discovered', output.entities.length, { agentId: this.id }, this.id);
      this.ctx.metrics.increment(this.businessId, 'opportunities.created', output.opportunities.length, { agentId: this.id }, this.id);

      await this.ctx.events.emit(
        EventBus.createEvent({
          businessId: this.businessId,
          type: 'agent.run.completed',
          source: this.id,
          agentId: this.id,
          runId: this.run.id,
          data: { entitiesDiscovered: output.entities.length, summary: output.summary },
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.run = { ...this.run, status: 'failed', error: message, completedAt: new Date() };

      this.ctx.metrics.increment(this.businessId, 'agent.runs.failed', 1, { agentId: this.id }, this.id);

      await this.ctx.events.emit(
        EventBus.createEvent({
          businessId: this.businessId,
          type: 'agent.run.failed',
          source: this.id,
          agentId: this.id,
          runId: this.run.id,
          data: { error: message },
        })
      );
    }

    return this.run;
  }

  protected abstract run_impl(): Promise<AgentRunOutput>;

  protected emitEntityDiscovered(entity: Entity): void {
    this.ctx.events.emit(
      EventBus.createEvent({
        businessId: this.businessId,
        type: 'entity.discovered',
        source: this.id,
        agentId: this.id,
        runId: this.run.id,
        entityId: entity.id,
        data: { entityType: entity.type, name: entity.name },
      })
    );
  }

  protected emitOpportunityCreated(opp: Opportunity): void {
    this.ctx.events.emit(
      EventBus.createEvent({
        businessId: this.businessId,
        type: 'opportunity.created',
        source: this.id,
        agentId: this.id,
        runId: this.run.id,
        opportunityId: opp.id,
        data: { title: opp.title, score: opp.score },
      })
    );
  }

  protected checkpoint(phase: string, data: Record<string, unknown>): void {
    this.state.phase = phase;
    this.state.checkpoints.push({ phase, data, timestamp: new Date() });
    this.state.updatedAt = new Date();
  }

  protected makeEntity(
    partial: Omit<Entity, 'id' | 'businessId' | 'status' | 'tags' | 'createdAt' | 'updatedAt'>
  ): Entity {
    return {
      ...partial,
      id: crypto.randomUUID(),
      businessId: this.businessId,
      status: 'new',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  protected makeOpportunity(
    partial: Omit<Opportunity, 'id' | 'businessId' | 'agentId' | 'runId' | 'stage' | 'tags' | 'createdAt' | 'updatedAt'>
  ): Opportunity {
    return {
      ...partial,
      id: crypto.randomUUID(),
      businessId: this.businessId,
      agentId: this.id,
      runId: this.run.id,
      stage: 'identified',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  protected makeAction(
    partial: Omit<Action, 'id' | 'businessId' | 'agentId' | 'status' | 'createdAt' | 'updatedAt'>
  ): Action {
    return {
      ...partial,
      id: crypto.randomUUID(),
      businessId: this.businessId,
      agentId: this.id,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private initRun(trigger: RunTrigger, input: Record<string, unknown>): AgentRun {
    return {
      id: crypto.randomUUID(),
      businessId: this.businessId,
      agentId: this.id,
      status: 'running',
      trigger,
      input,
      tasksTotal: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      entitiesDiscovered: 0,
      entitiesActioned: 0,
      startedAt: new Date(),
      createdAt: new Date(),
    };
  }

  private initState(): AgentState {
    return {
      agentId: this.id,
      businessId: this.businessId,
      runId: this.run.id,
      phase: 'init',
      memory: {},
      checkpoints: [],
      updatedAt: new Date(),
    };
  }
}
