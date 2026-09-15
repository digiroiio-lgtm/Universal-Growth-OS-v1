import type { VercelRequest, VercelResponse } from '@vercel/node';
import { EventBus, TaskManager, MetricsCollector, AgentRegistry, AgentRunner } from '../growth-os/core/index.js';
import type { AgentDefinition, AgentContext } from '../growth-os/core/index.js';
import { boothquotesConfig } from '../growth-os/modules/boothquotes/config.js';
import { TradeShowDiscoveryAgent } from '../growth-os/agents/discovery/TradeShowDiscovery.js';
import { BuilderSupplyGapAgent } from '../growth-os/agents/discovery/BuilderSupplyGap.js';
import { SEOOpportunityAgent } from '../growth-os/agents/discovery/SEOOpportunity.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST /api/run' });
    return;
  }

  const { businessId = 'boothquotes', agentType } = (req.body as Record<string, string>) ?? {};

  if (businessId !== 'boothquotes') {
    res.status(400).json({ error: `Unknown business: ${businessId}` });
    return;
  }

  const events = new EventBus();
  const tasks = new TaskManager();
  const metrics = new MetricsCollector();
  const ctx: AgentContext = { events, tasks, metrics };

  const registry = new AgentRegistry();
  registry.register('trade_show_discovery', TradeShowDiscoveryAgent);
  registry.register('builder_supply_gap', BuilderSupplyGapAgent);
  registry.register('seo_opportunity', SEOOpportunityAgent);

  const agentsToRun = agentType
    ? boothquotesConfig.agents.filter(a => a.agentType === agentType && a.enabled)
    : boothquotesConfig.agents.filter(a => a.enabled);

  if (agentsToRun.length === 0) {
    res.status(400).json({ error: `No enabled agent found for type: ${agentType ?? 'any'}` });
    return;
  }

  for (const agentCfg of agentsToRun) {
    const def: AgentDefinition = {
      id: crypto.randomUUID(),
      businessId,
      name: agentCfg.agentType,
      agentType: agentCfg.agentType,
      description: `${agentCfg.agentType} for ${businessId}`,
      config: { inputs: agentCfg.config, outputTypes: boothquotesConfig.entityTypes },
      schedule: agentCfg.schedule,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    registry.addDefinition(def);
  }

  const runner = new AgentRunner(registry, ctx);
  const runs = await runner.runAll(businessId, 'api');

  const summary = runs.map(r => ({
    agentType: agentsToRun.find(a => registry.listDefinitions(businessId).some(d => d.id === r.agentId && d.agentType === a.agentType))?.agentType ?? r.agentId,
    status: r.status,
    entitiesDiscovered: r.entitiesDiscovered,
    opportunitiesCreated: r.output?.opportunities.length ?? 0,
    summary: r.output?.summary ?? r.error,
    durationMs: r.completedAt
      ? r.completedAt.getTime() - r.startedAt.getTime()
      : null,
  }));

  res.json({
    businessId,
    trigger: 'api',
    timestamp: new Date().toISOString(),
    runs: summary,
    totals: {
      entities: summary.reduce((n, r) => n + r.entitiesDiscovered, 0),
      opportunities: summary.reduce((n, r) => n + r.opportunitiesCreated, 0),
    },
  });
}
