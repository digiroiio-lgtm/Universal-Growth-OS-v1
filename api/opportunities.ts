import type { VercelRequest, VercelResponse } from '@vercel/node';
import { EventBus, TaskManager, MetricsCollector, AgentRegistry, AgentRunner } from '../growth-os/core/index.js';
import type { AgentDefinition, AgentContext, Opportunity } from '../growth-os/core/index.js';
import { boothquotesConfig } from '../growth-os/modules/boothquotes/config.js';
import { TradeShowDiscoveryAgent } from '../growth-os/agents/discovery/TradeShowDiscovery.js';
import { BuilderSupplyGapAgent } from '../growth-os/agents/discovery/BuilderSupplyGap.js';
import { SEOOpportunityAgent } from '../growth-os/agents/discovery/SEOOpportunity.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use GET /api/opportunities' });
    return;
  }

  const minScore = parseInt(String(req.query.minScore ?? '0'), 10);
  const type = req.query.type as string | undefined;

  const events = new EventBus();
  const tasks = new TaskManager();
  const metrics = new MetricsCollector();
  const ctx: AgentContext = { events, tasks, metrics };

  const registry = new AgentRegistry();
  registry.register('trade_show_discovery', TradeShowDiscoveryAgent);
  registry.register('builder_supply_gap', BuilderSupplyGapAgent);
  registry.register('seo_opportunity', SEOOpportunityAgent);

  for (const agentCfg of boothquotesConfig.agents.filter(a => a.enabled)) {
    const def: AgentDefinition = {
      id: crypto.randomUUID(),
      businessId: 'boothquotes',
      name: agentCfg.agentType,
      agentType: agentCfg.agentType,
      description: `${agentCfg.agentType} for boothquotes`,
      config: { inputs: agentCfg.config, outputTypes: boothquotesConfig.entityTypes },
      schedule: agentCfg.schedule,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    registry.addDefinition(def);
  }

  const runner = new AgentRunner(registry, ctx);
  const runs = await runner.runAll('boothquotes', 'api');

  let opportunities: Opportunity[] = runs.flatMap(r => r.output?.opportunities ?? []);

  if (minScore > 0) opportunities = opportunities.filter(o => o.score >= minScore);
  if (type) opportunities = opportunities.filter(o => o.type === type);

  opportunities.sort((a, b) => b.score - a.score);

  res.json({
    businessId: 'boothquotes',
    timestamp: new Date().toISOString(),
    filters: { minScore, type: type ?? null },
    count: opportunities.length,
    opportunities: opportunities.map(o => ({
      id: o.id,
      type: o.type,
      title: o.title,
      score: o.score,
      confidence: o.confidence,
      estimatedValue: o.estimatedValue,
      stage: o.stage,
    })),
  });
}
