import { BaseAgent } from '../../core/agents/BaseAgent.js';
import type { AgentRunOutput, Entity, Opportunity } from '../../core/types/index.js';
import type { TradeShow } from '../../modules/boothquotes/types.js';

interface TradeShowDiscoveryConfig {
  sources: string[];
  targetIndustries: string[];
  geography: string;
  lookAheadDays: number;
  minAttendees: number;
  minExhibitors: number;
  preferRecurring: boolean;
}

export class TradeShowDiscoveryAgent extends BaseAgent {
  protected async run_impl(): Promise<AgentRunOutput> {
    const cfg = this.config.inputs as unknown as TradeShowDiscoveryConfig;

    this.checkpoint('init', { sources: cfg.sources });

    const raw = await this.fetchShows(cfg);
    this.checkpoint('fetched', { count: raw.length });

    const filtered = this.filterShows(raw, cfg);
    this.checkpoint('filtered', { count: filtered.length });

    const entities: Entity[] = [];
    const opportunities: Opportunity[] = [];

    for (const show of filtered) {
      const entity = this.makeEntity({
        type: 'trade_show',
        name: show.name,
        source: show.source,
        sourceId: `${show.name}__${show.startDate}`,
        data: show as unknown as Record<string, unknown>,
      });
      entities.push(entity);
      this.emitEntityDiscovered(entity);

      const score = this.scoreShow(show, cfg);
      if (score >= 65) {
        const opp = this.makeOpportunity({
          entityId: entity.id,
          type: 'trade_show_booth',
          title: `Booth opportunity: ${show.name}`,
          description: `${show.city}, ${show.state} — ${show.startDate}. Est. ${show.expectedAttendees ?? 'unknown'} attendees, ${show.expectedExhibitors ?? 'unknown'} exhibitors.`,
          score,
          confidence: this.computeConfidence(show),
          estimatedValue: this.estimateValue(show),
          data: {
            showName: show.name,
            startDate: show.startDate,
            city: show.city,
            state: show.state,
            industries: show.industry,
            attendees: show.expectedAttendees,
            exhibitors: show.expectedExhibitors,
          },
        });
        opportunities.push(opp);
        this.emitOpportunityCreated(opp);
      }
    }

    this.checkpoint('complete', { entities: entities.length, opportunities: opportunities.length });

    return {
      entities,
      opportunities,
      actions: [],
      metrics: {
        showsFetched: raw.length,
        showsFiltered: filtered.length,
        opportunitiesCreated: opportunities.length,
      },
      summary: `Discovered ${entities.length} trade shows, created ${opportunities.length} qualified opportunities.`,
    };
  }

  // In production: call real data sources (web scraping, APIs, databases)
  // Returns simulated realistic data for architecture validation
  private async fetchShows(cfg: TradeShowDiscoveryConfig): Promise<TradeShow[]> {
    const now = new Date();
    const shows: TradeShow[] = [
      {
        name: 'IBS — International Builders Show',
        organizer: 'NAHB',
        website: 'buildersshow.com',
        startDate: this.daysFromNow(now, 45),
        endDate: this.daysFromNow(now, 47),
        venue: 'Orange County Convention Center',
        city: 'Orlando',
        state: 'FL',
        country: 'US',
        industry: ['construction', 'building_materials', 'real_estate'],
        expectedAttendees: 65000,
        expectedExhibitors: 1600,
        estimatedBoothCost: 4500,
        isRecurring: true,
        frequency: 'annual',
        source: 'nahb',
        sourceUrl: 'https://buildersshow.com',
      },
      {
        name: 'SURFACES — The Floor Covering Industry Trade Show',
        organizer: 'Informa Markets',
        website: 'floorcoveringevents.com',
        startDate: this.daysFromNow(now, 62),
        endDate: this.daysFromNow(now, 64),
        venue: 'Mandalay Bay Convention Center',
        city: 'Las Vegas',
        state: 'NV',
        country: 'US',
        industry: ['flooring', 'building_materials', 'retail'],
        expectedAttendees: 20000,
        expectedExhibitors: 500,
        estimatedBoothCost: 3200,
        isRecurring: true,
        frequency: 'annual',
        source: 'tradeshoweye',
      },
      {
        name: 'AHR Expo — HVAC, Plumbing & Refrigeration',
        organizer: 'ASHRAE',
        website: 'ahrexpo.com',
        startDate: this.daysFromNow(now, 78),
        endDate: this.daysFromNow(now, 80),
        venue: 'McCormick Place',
        city: 'Chicago',
        state: 'IL',
        country: 'US',
        industry: ['hvac', 'plumbing', 'building_materials', 'manufacturing'],
        expectedAttendees: 45000,
        expectedExhibitors: 1800,
        estimatedBoothCost: 5200,
        isRecurring: true,
        frequency: 'annual',
        source: 'ahrexpo',
      },
      {
        name: 'National Hardware Show',
        organizer: 'Reed Exhibitions',
        website: 'nationalhardwareshow.com',
        startDate: this.daysFromNow(now, 55),
        endDate: this.daysFromNow(now, 57),
        venue: 'Las Vegas Convention Center',
        city: 'Las Vegas',
        state: 'NV',
        country: 'US',
        industry: ['retail', 'manufacturing', 'construction'],
        expectedAttendees: 30000,
        expectedExhibitors: 2500,
        estimatedBoothCost: 3800,
        isRecurring: true,
        frequency: 'annual',
        source: 'eventsinamerica',
      },
      {
        name: 'KBIS — Kitchen & Bath Industry Show',
        organizer: 'NKBA',
        website: 'kbis.com',
        startDate: this.daysFromNow(now, 70),
        endDate: this.daysFromNow(now, 72),
        venue: 'Las Vegas Convention Center',
        city: 'Las Vegas',
        state: 'NV',
        country: 'US',
        industry: ['building_materials', 'real_estate', 'retail'],
        expectedAttendees: 100000,
        expectedExhibitors: 600,
        estimatedBoothCost: 6500,
        isRecurring: true,
        frequency: 'annual',
        source: 'kbis',
      },
      {
        name: 'GreenBuild International Conference',
        organizer: 'USGBC',
        website: 'greenbuildexpo.com',
        startDate: this.daysFromNow(now, 110),
        endDate: this.daysFromNow(now, 112),
        venue: 'Pennsylvania Convention Center',
        city: 'Philadelphia',
        state: 'PA',
        country: 'US',
        industry: ['construction', 'real_estate', 'building_materials'],
        expectedAttendees: 25000,
        expectedExhibitors: 800,
        estimatedBoothCost: 4200,
        isRecurring: true,
        frequency: 'annual',
        source: 'tsnn',
      },
    ];

    void cfg; // used by filters below
    return shows;
  }

  private filterShows(shows: TradeShow[], cfg: TradeShowDiscoveryConfig): TradeShow[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + cfg.lookAheadDays);

    return shows.filter(show => {
      if (new Date(show.startDate) > cutoff) return false;
      if (cfg.geography === 'US' && show.country !== 'US') return false;
      if ((show.expectedAttendees ?? 0) < cfg.minAttendees) return false;
      if ((show.expectedExhibitors ?? 0) < cfg.minExhibitors) return false;
      const industryMatch = show.industry.some(i => cfg.targetIndustries.includes(i));
      if (!industryMatch) return false;
      return true;
    });
  }

  private scoreShow(show: TradeShow, cfg: TradeShowDiscoveryConfig): number {
    let score = 0;

    // Attendee count (25%)
    const attendees = show.expectedAttendees ?? 0;
    score += Math.min(attendees / 1000, 10) * 2.5;

    // Industry match depth (30%)
    const matchCount = show.industry.filter(i => cfg.targetIndustries.includes(i)).length;
    score += (matchCount / cfg.targetIndustries.length) * 30;

    // Geography (20%) — all US gets full score for now
    if (show.country === 'US') score += 20;

    // Time to event (15%) — optimal window 30-90 days
    const daysOut = Math.ceil(
      (new Date(show.startDate).getTime() - Date.now()) / 86400000
    );
    if (daysOut >= 30 && daysOut <= 90) score += 15;
    else if (daysOut < 30) score += 5;
    else score += 8;

    // Exhibitor count (10%)
    const exhibitors = show.expectedExhibitors ?? 0;
    score += Math.min(exhibitors / 50, 10);

    return Math.round(score);
  }

  private computeConfidence(show: TradeShow): number {
    let filled = 0;
    const fields: (keyof TradeShow)[] = [
      'expectedAttendees', 'expectedExhibitors', 'estimatedBoothCost',
      'venue', 'city', 'industry', 'organizer',
    ];
    for (const f of fields) {
      if (show[f] !== undefined && show[f] !== null) filled++;
    }
    return Math.round((filled / fields.length) * 100);
  }

  private estimateValue(show: TradeShow): number {
    const base = show.estimatedBoothCost ?? 3500;
    const attendeeMultiplier = Math.min((show.expectedAttendees ?? 1000) / 10000, 3);
    return Math.round(base * (1 + attendeeMultiplier));
  }

  private daysFromNow(base: Date, days: number): string {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
}
