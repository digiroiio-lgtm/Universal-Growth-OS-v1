/**
 * Universal Growth OS
 * Multi-business, configuration-driven growth intelligence platform
 *
 * Wires together the core infrastructure, registers business modules,
 * and runs the initial BoothQuotes agent suite.
 */

import { EventBus, TaskManager, MetricsCollector, AgentRegistry, AgentRunner } from './core/index.js';
import type { AgentDefinition, AgentContext } from './core/index.js';
import { boothquotesConfig } from './modules/boothquotes/index.js';
import {
  TradeShowDiscoveryAgent,
  BuilderSupplyGapAgent,
  SEOOpportunityAgent,
} from './agents/discovery/index.js';

// ─── Bootstrap core infrastructure ──────────────────────────────────────────

const events = new EventBus();
const tasks = new TaskManager();
const metrics = new MetricsCollector();

const ctx: AgentContext = { events, tasks, metrics };

// ─── Register agent types ────────────────────────────────────────────────────

const registry = new AgentRegistry();
registry.register('trade_show_discovery', TradeShowDiscoveryAgent);
registry.register('builder_supply_gap', BuilderSupplyGapAgent);
registry.register('seo_opportunity', SEOOpportunityAgent);

// ─── Register event listeners ────────────────────────────────────────────────

events.on('entity.discovered', e =>
  console.log(`[event] entity.discovered  ${e.data.name ?? e.entityId}`)
);
events.on('opportunity.created', e =>
  console.log(`[event] opportunity.created  score=${e.data.score}  "${e.data.title}"`)
);
events.on('agent.run.completed', e =>
  console.log(`[event] agent.run.completed  entities=${e.data.entitiesDiscovered}  "${e.data.summary}"`)
);
events.on('agent.run.failed', e =>
  console.error(`[event] agent.run.failed  ${e.data.error}`)
);

// ─── Bootstrap BoothQuotes business + agents ─────────────────────────────────

const BUSINESS_ID = 'boothquotes';

for (const agentCfg of boothquotesConfig.agents) {
  if (!agentCfg.enabled) continue;

  const definition: AgentDefinition = {
    id: crypto.randomUUID(),
    businessId: BUSINESS_ID,
    name: agentCfg.agentType,
    agentType: agentCfg.agentType,
    description: `${agentCfg.agentType} agent for ${boothquotesConfig.name}`,
    config: {
      inputs: agentCfg.config,
      outputTypes: boothquotesConfig.entityTypes,
    },
    schedule: agentCfg.schedule,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  registry.addDefinition(definition);
}

// ─── Run all BoothQuotes agents ───────────────────────────────────────────────

const runner = new AgentRunner(registry, ctx);

console.log('\n=== Universal Growth OS — BoothQuotes Agent Run ===\n');

const runs = await runner.runAll(BUSINESS_ID, 'manual');

console.log('\n=== Run Summary ===\n');
for (const run of runs) {
  const status = run.status === 'completed' ? '✓' : '✗';
  console.log(
    `${status} ${run.agentId}\n` +
    `  entities: ${run.entitiesDiscovered}  |  ` +
    `opportunities: ${run.output?.opportunities.length ?? 0}  |  ` +
    `status: ${run.status}`
  );
  if (run.output?.summary) console.log(`  ${run.output.summary}`);
  console.log();
}
