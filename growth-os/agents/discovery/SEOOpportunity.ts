import { BaseAgent } from '../../core/agents/BaseAgent.js';
import type { AgentRunOutput, Entity, Opportunity } from '../../core/types/index.js';
import type { SEOOpportunity } from '../../modules/boothquotes/types.js';

interface SEOOpportunityConfig {
  seedKeywords: string[];
  competitorDomains: string[];
  targetIntents: string[];
  maxDifficulty: number;
  minSearchVolume: number;
  targetPages: string[];
}

export class SEOOpportunityAgent extends BaseAgent {
  protected async run_impl(): Promise<AgentRunOutput> {
    const cfg = this.config.inputs as unknown as SEOOpportunityConfig;

    this.checkpoint('init', { seedKeywords: cfg.seedKeywords.length });

    const opportunities = await this.discoverKeywords(cfg);
    this.checkpoint('discovered', { count: opportunities.length });

    const filtered = opportunities.filter(
      o =>
        o.difficulty <= cfg.maxDifficulty &&
        o.searchVolume >= cfg.minSearchVolume &&
        (cfg.targetIntents.length === 0 || cfg.targetIntents.includes(o.intent))
    );
    this.checkpoint('filtered', { count: filtered.length });

    const entities: Entity[] = [];
    const opps: Opportunity[] = [];

    for (const kw of filtered) {
      const entity = this.makeEntity({
        type: 'keyword',
        name: kw.keyword,
        source: 'seo_research',
        data: kw as unknown as Record<string, unknown>,
      });
      entities.push(entity);
      this.emitEntityDiscovered(entity);

      const score = this.scoreKeyword(kw);
      const opp = this.makeOpportunity({
        entityId: entity.id,
        type: 'seo_content',
        title: `SEO: "${kw.keyword}" — ${kw.recommendedAction}`,
        description: this.buildDescription(kw),
        score,
        confidence: 80,
        estimatedValue: this.estimateValue(kw),
        data: kw as unknown as Record<string, unknown>,
      });
      opps.push(opp);
      this.emitOpportunityCreated(opp);
    }

    // Content gap analysis on top competitors
    const contentGaps = await this.analyzeContentGaps(cfg);
    for (const gap of contentGaps) {
      const entity = this.makeEntity({
        type: 'content_gap',
        name: `Content gap: ${gap.topic}`,
        source: 'competitor_analysis',
        data: gap,
      });
      entities.push(entity);
      this.emitEntityDiscovered(entity);
    }

    this.checkpoint('complete', { entities: entities.length, opportunities: opps.length });

    return {
      entities,
      opportunities: opps,
      actions: [],
      metrics: {
        keywordsAnalyzed: opportunities.length,
        keywordsQualified: filtered.length,
        contentGapsFound: contentGaps.length,
        opportunitiesCreated: opps.length,
      },
      summary: `Analyzed ${opportunities.length} keywords, ${filtered.length} qualified. Found ${contentGaps.length} content gaps.`,
    };
  }

  // In production: call Ahrefs/SEMrush/Moz API or DataForSEO
  private async discoverKeywords(cfg: SEOOpportunityConfig): Promise<SEOOpportunity[]> {
    const baseKeywords: SEOOpportunity[] = [
      {
        keyword: 'trade show booth rental',
        searchVolume: 2400,
        difficulty: 42,
        currentRank: undefined,
        targetUrl: '/services/booth-rental',
        competitorUrls: ['exhibitgroup.com/rentals', 'skyline.com/rentals'],
        intent: 'commercial',
        estimatedTrafficGain: 480,
        recommendedAction: 'create',
        contentGap: 'No dedicated rental landing page with pricing',
      },
      {
        keyword: 'custom trade show booths',
        searchVolume: 3600,
        difficulty: 55,
        currentRank: 18,
        targetUrl: '/services/custom-booths',
        competitorUrls: ['nimlok.com', 'exhibitgroup.com'],
        intent: 'commercial',
        estimatedTrafficGain: 320,
        recommendedAction: 'optimize',
      },
      {
        keyword: 'trade show booth builder near me',
        searchVolume: 1900,
        difficulty: 38,
        currentRank: undefined,
        targetUrl: '/locations',
        competitorUrls: [],
        intent: 'commercial',
        estimatedTrafficGain: 570,
        recommendedAction: 'create',
        contentGap: 'No local/near-me service page',
      },
      {
        keyword: 'trade show display ideas',
        searchVolume: 8100,
        difficulty: 48,
        currentRank: undefined,
        targetUrl: '/gallery/ideas',
        competitorUrls: ['displaywizard.com', 'tradeshow.com/ideas'],
        intent: 'informational',
        estimatedTrafficGain: 1200,
        recommendedAction: 'create',
        contentGap: 'Gallery page without SEO optimized content',
      },
      {
        keyword: 'how much does a trade show booth cost',
        searchVolume: 5400,
        difficulty: 35,
        currentRank: undefined,
        targetUrl: '/pricing',
        competitorUrls: ['skyline.com/pricing-guide'],
        intent: 'commercial',
        estimatedTrafficGain: 810,
        recommendedAction: 'create',
        contentGap: 'No transparent pricing/cost guide page',
      },
      {
        keyword: 'modular exhibition stand',
        searchVolume: 1600,
        difficulty: 44,
        currentRank: undefined,
        targetUrl: '/services/modular-stands',
        competitorUrls: ['octanomgroup.com', 'nimlock.com'],
        intent: 'commercial',
        estimatedTrafficGain: 240,
        recommendedAction: 'create',
      },
      {
        keyword: 'trade show booth setup service',
        searchVolume: 720,
        difficulty: 28,
        currentRank: undefined,
        targetUrl: '/services/installation',
        competitorUrls: [],
        intent: 'transactional',
        estimatedTrafficGain: 180,
        recommendedAction: 'create',
        contentGap: 'No dedicated setup/I&D services page',
      },
      {
        keyword: 'exhibition booth construction',
        searchVolume: 2900,
        difficulty: 52,
        currentRank: 24,
        targetUrl: '/services/construction',
        competitorUrls: ['exhibitgroup.com/construction'],
        intent: 'commercial',
        estimatedTrafficGain: 290,
        recommendedAction: 'optimize',
      },
    ];

    void cfg;
    return baseKeywords;
  }

  private async analyzeContentGaps(cfg: SEOOpportunityConfig): Promise<Record<string, unknown>[]> {
    void cfg;
    return [
      {
        topic: 'Trade show ROI calculator',
        competitorCount: 3,
        searchDemand: 'high',
        recommendedFormat: 'interactive_tool',
        estimatedTraffic: 2000,
      },
      {
        topic: 'Trade show checklist templates',
        competitorCount: 5,
        searchDemand: 'medium',
        recommendedFormat: 'downloadable_template',
        estimatedTraffic: 900,
      },
      {
        topic: 'Industry-specific booth designs (construction, healthcare, food)',
        competitorCount: 2,
        searchDemand: 'high',
        recommendedFormat: 'gallery_pages',
        estimatedTraffic: 1500,
      },
    ];
  }

  private scoreKeyword(kw: SEOOpportunity): number {
    let score = 0;

    // Search volume (35%)
    score += Math.min(kw.searchVolume / 200, 35);

    // Ease (low difficulty) (30%)
    score += Math.max(0, (60 - kw.difficulty) / 2);

    // Traffic gain potential (20%)
    const gain = kw.estimatedTrafficGain ?? 0;
    score += Math.min(gain / 50, 20);

    // Intent (15%)
    if (kw.intent === 'transactional') score += 15;
    else if (kw.intent === 'commercial') score += 12;
    else if (kw.intent === 'informational') score += 5;

    return Math.round(score);
  }

  private buildDescription(kw: SEOOpportunity): string {
    const rank = kw.currentRank ? `Currently ranking #${kw.currentRank}.` : 'Not currently ranking.';
    const gain = kw.estimatedTrafficGain ? `Est. +${kw.estimatedTrafficGain} monthly visits.` : '';
    return (
      `Keyword: "${kw.keyword}" — ${kw.searchVolume.toLocaleString()} searches/mo, ` +
      `difficulty ${kw.difficulty}/100. ${rank} ${gain} ` +
      `Action: ${kw.recommendedAction}.${kw.contentGap ? ' Gap: ' + kw.contentGap : ''}`
    );
  }

  private estimateValue(kw: SEOOpportunity): number {
    const trafficGain = kw.estimatedTrafficGain ?? kw.searchVolume * 0.1;
    const conversionRate = 0.02;
    const avgOrderValue = 4500;
    return Math.round(trafficGain * conversionRate * avgOrderValue);
  }
}
