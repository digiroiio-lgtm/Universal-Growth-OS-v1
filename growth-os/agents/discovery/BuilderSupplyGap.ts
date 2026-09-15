import { BaseAgent } from '../../core/agents/BaseAgent.js';
import type { AgentRunOutput, Entity, Opportunity } from '../../core/types/index.js';
import type { SupplyGapOpportunity } from '../../modules/boothquotes/types.js';

interface BuilderSupplyGapConfig {
  categories: string[];
  regions: string[];
  gapTypes: string[];
  severityThreshold: 'low' | 'medium' | 'high' | 'critical';
  sources: string[];
}

const SEVERITY_RANK: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export class BuilderSupplyGapAgent extends BaseAgent {
  protected async run_impl(): Promise<AgentRunOutput> {
    const cfg = this.config.inputs as unknown as BuilderSupplyGapConfig;

    this.checkpoint('init', { categories: cfg.categories.length, regions: cfg.regions.length });

    const gaps = await this.scanSupplyGaps(cfg);
    this.checkpoint('scanned', { gaps: gaps.length });

    const qualified = gaps.filter(
      g => SEVERITY_RANK[g.severity] >= SEVERITY_RANK[cfg.severityThreshold]
    );
    this.checkpoint('qualified', { qualified: qualified.length });

    const entities: Entity[] = [];
    const opportunities: Opportunity[] = [];

    for (const gap of qualified) {
      const entity = this.makeEntity({
        type: 'opportunity',
        name: `Supply Gap: ${gap.product} in ${gap.region}`,
        source: gap.sources[0] ?? 'scraped',
        data: gap as unknown as Record<string, unknown>,
      });
      entities.push(entity);
      this.emitEntityDiscovered(entity);

      const score = this.scoreGap(gap);
      const opp = this.makeOpportunity({
        entityId: entity.id,
        type: 'supply_gap',
        title: `${gap.product} supply gap — ${gap.region} (${gap.gapType.replace('_', ' ')})`,
        description: this.buildDescription(gap),
        score,
        confidence: gap.gapPercent !== undefined ? 90 : 65,
        estimatedValue: this.estimateValue(gap),
        data: gap as unknown as Record<string, unknown>,
      });
      opportunities.push(opp);
      this.emitOpportunityCreated(opp);
    }

    this.checkpoint('complete', { entities: entities.length, opportunities: opportunities.length });

    return {
      entities,
      opportunities,
      actions: [],
      metrics: {
        gapsScanned: gaps.length,
        gapsQualified: qualified.length,
        opportunitiesCreated: opportunities.length,
      },
      summary: `Found ${gaps.length} supply gaps, ${qualified.length} met threshold, created ${opportunities.length} opportunities.`,
    };
  }

  // In production: parse NAHB reports, scrape distributor sites, use commodity APIs
  private async scanSupplyGaps(cfg: BuilderSupplyGapConfig): Promise<SupplyGapOpportunity[]> {
    const now = new Date().toISOString().split('T')[0];

    const gaps: SupplyGapOpportunity[] = [
      {
        category: 'lumber',
        product: 'Oriented Strand Board (OSB)',
        region: 'southeast',
        gapType: 'price_spike',
        severity: 'high',
        estimatedDemand: 850000,
        currentSupply: 620000,
        gapPercent: 27,
        sources: ['framing_lumber', 'nahb'],
        affectedIndustries: ['construction', 'building_materials'],
        detectedAt: now,
      },
      {
        category: 'roofing',
        product: 'Asphalt Shingles (30yr)',
        region: 'midwest',
        gapType: 'shortage',
        severity: 'critical',
        estimatedDemand: 1200000,
        currentSupply: 700000,
        gapPercent: 42,
        sources: ['construction_dive', 'hbs_dealer'],
        affectedIndustries: ['construction', 'roofing'],
        detectedAt: now,
      },
      {
        category: 'hvac',
        product: 'Heat Pump Systems (3-ton)',
        region: 'northeast',
        gapType: 'distributor_exit',
        severity: 'high',
        estimatedDemand: 45000,
        currentSupply: 28000,
        gapPercent: 38,
        sources: ['construction_dive'],
        affectedIndustries: ['hvac', 'construction', 'real_estate'],
        detectedAt: now,
      },
      {
        category: 'windows',
        product: 'Double-Pane Vinyl Windows',
        region: 'southwest',
        gapType: 'price_spike',
        severity: 'medium',
        estimatedDemand: 200000,
        currentSupply: 155000,
        gapPercent: 22,
        sources: ['hbs_dealer'],
        affectedIndustries: ['construction', 'real_estate'],
        detectedAt: now,
      },
      {
        category: 'electrical',
        product: 'Electrical Panel Boxes (200A)',
        region: 'northwest',
        gapType: 'shortage',
        severity: 'critical',
        estimatedDemand: 90000,
        currentSupply: 41000,
        gapPercent: 54,
        sources: ['nahb', 'construction_dive'],
        affectedIndustries: ['construction', 'electrical'],
        detectedAt: now,
      },
      {
        category: 'insulation',
        product: 'Spray Foam Insulation',
        region: 'midwest',
        gapType: 'shortage',
        severity: 'low',
        estimatedDemand: 340000,
        currentSupply: 310000,
        gapPercent: 9,
        sources: ['hbs_dealer'],
        affectedIndustries: ['construction', 'building_materials'],
        detectedAt: now,
      },
    ];

    return gaps.filter(g =>
      cfg.categories.includes(g.category) &&
      cfg.regions.includes(g.region) &&
      cfg.gapTypes.includes(g.gapType)
    );
  }

  private scoreGap(gap: SupplyGapOpportunity): number {
    let score = 0;

    // Severity (40%)
    score += SEVERITY_RANK[gap.severity] * 10;

    // Gap percent (35%)
    const pct = gap.gapPercent ?? 0;
    score += Math.min(pct, 50) * 0.7;

    // Industry breadth (15%)
    score += Math.min(gap.affectedIndustries.length * 5, 15);

    // Source count (10%)
    score += Math.min(gap.sources.length * 5, 10);

    return Math.round(score);
  }

  private buildDescription(gap: SupplyGapOpportunity): string {
    const pctStr = gap.gapPercent !== undefined ? `${gap.gapPercent}% gap` : 'significant gap';
    return (
      `${gap.gapType.replace('_', ' ')} in ${gap.product} (${gap.category}) ` +
      `across ${gap.region} region. ${pctStr} detected. ` +
      `Affects: ${gap.affectedIndustries.join(', ')}.`
    );
  }

  private estimateValue(gap: SupplyGapOpportunity): number {
    const base = 2000;
    const severityMultiplier = SEVERITY_RANK[gap.severity];
    const pctBonus = (gap.gapPercent ?? 0) * 10;
    return Math.round(base * severityMultiplier + pctBonus);
  }
}
