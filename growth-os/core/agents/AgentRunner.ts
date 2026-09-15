import type { AgentRun, RunTrigger } from '../types/index.js';
import { AgentRegistry } from './AgentRegistry.js';
import type { AgentContext } from './BaseAgent.js';

export class AgentRunner {
  constructor(
    private readonly registry: AgentRegistry,
    private readonly ctx: AgentContext
  ) {}

  async run(
    definitionId: string,
    trigger: RunTrigger = 'manual',
    input: Record<string, unknown> = {}
  ): Promise<AgentRun> {
    const agent = this.registry.create(definitionId, this.ctx);
    return agent.execute(trigger, input);
  }

  async runAll(businessId: string, trigger: RunTrigger = 'scheduled'): Promise<AgentRun[]> {
    const definitions = this.registry.listDefinitions(businessId);
    const results = await Promise.allSettled(
      definitions.map(def => this.run(def.id, trigger))
    );

    return results.map(r => {
      if (r.status === 'fulfilled') return r.value;
      throw r.reason;
    });
  }
}
