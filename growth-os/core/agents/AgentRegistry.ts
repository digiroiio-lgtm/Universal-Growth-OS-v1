import type { AgentDefinition } from '../types/index.js';
import type { AgentContext } from './BaseAgent.js';
import type { BaseAgent } from './BaseAgent.js';

type AgentConstructor = new (definition: AgentDefinition, ctx: AgentContext) => BaseAgent;

export class AgentRegistry {
  private constructors = new Map<string, AgentConstructor>();
  private definitions = new Map<string, AgentDefinition>();

  register(agentType: string, ctor: AgentConstructor): void {
    this.constructors.set(agentType, ctor);
  }

  addDefinition(def: AgentDefinition): void {
    this.definitions.set(def.id, def);
  }

  create(definitionId: string, ctx: AgentContext): BaseAgent {
    const def = this.definitions.get(definitionId);
    if (!def) throw new Error(`Agent definition not found: ${definitionId}`);

    const Ctor = this.constructors.get(def.agentType);
    if (!Ctor) throw new Error(`No constructor registered for agent type: ${def.agentType}`);

    return new Ctor(def, ctx);
  }

  listDefinitions(businessId: string): AgentDefinition[] {
    return Array.from(this.definitions.values()).filter(
      d => d.businessId === businessId && d.enabled
    );
  }

  hasType(agentType: string): boolean {
    return this.constructors.has(agentType);
  }
}
