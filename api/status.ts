import type { VercelRequest, VercelResponse } from '@vercel/node';
import { boothquotesConfig } from '../growth-os/modules/boothquotes/config.js';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    name: 'Universal Growth OS',
    version: '0.1.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    businesses: [
      {
        id: 'boothquotes',
        name: boothquotesConfig.name,
        module: boothquotesConfig.id,
        agents: boothquotesConfig.agents
          .filter(a => a.enabled)
          .map(a => ({ type: a.agentType, schedule: a.schedule ?? null })),
        entityTypes: boothquotesConfig.entityTypes,
      },
    ],
    endpoints: {
      status: 'GET /api/status',
      run: 'POST /api/run',
      opportunities: 'GET /api/opportunities',
    },
  });
}
