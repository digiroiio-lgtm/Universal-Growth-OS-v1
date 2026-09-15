import type { BusinessModuleConfig } from '../../core/types/index.js';

export const boothquotesConfig: BusinessModuleConfig = {
  id: 'boothquotes',
  name: 'BoothQuotes',
  description: 'Trade show booth quoting, lead generation and supply intelligence',
  entityTypes: ['trade_show', 'opportunity', 'keyword', 'content_gap'],

  agents: [
    {
      agentType: 'trade_show_discovery',
      enabled: true,
      schedule: '0 8 * * 1', // every Monday 8am
      config: {
        sources: ['tradeshoweye', 'eventsinamerica', 'tsnn', 'exhibitoronline'],
        targetIndustries: [
          'construction',
          'building_materials',
          'real_estate',
          'manufacturing',
          'retail',
          'food_beverage',
          'technology',
          'healthcare',
        ],
        geography: 'US',
        lookAheadDays: 90,
        minAttendees: 500,
        minExhibitors: 50,
        preferRecurring: true,
      },
    },
    {
      agentType: 'builder_supply_gap',
      enabled: true,
      schedule: '0 9 * * 3', // every Wednesday 9am
      config: {
        categories: [
          'lumber',
          'drywall',
          'roofing',
          'flooring',
          'insulation',
          'windows',
          'doors',
          'hvac',
          'plumbing',
          'electrical',
        ],
        regions: ['southeast', 'southwest', 'midwest', 'northeast', 'northwest'],
        gapTypes: ['shortage', 'price_spike', 'distributor_exit'],
        severityThreshold: 'medium',
        sources: ['nahb', 'framing_lumber', 'hbs_dealer', 'construction_dive'],
      },
    },
    {
      agentType: 'seo_opportunity',
      enabled: true,
      schedule: '0 9 * * 2', // every Tuesday 9am
      config: {
        seedKeywords: [
          'trade show booth',
          'exhibition booth rental',
          'trade show display',
          'booth construction',
          'modular trade show booth',
          'trade show exhibit',
          'custom trade show booth',
          'trade show setup',
        ],
        competitorDomains: [],
        targetIntents: ['commercial', 'transactional'],
        maxDifficulty: 60,
        minSearchVolume: 100,
        targetPages: ['services', 'contact', 'quote', 'gallery'],
      },
    },
  ],

  scoring: {
    model: 'boothquotes_v1',
    weights: {
      attendeeCount: 0.25,
      industryMatch: 0.30,
      geographyScore: 0.20,
      timeToEvent: 0.15,
      exhibitorCount: 0.10,
    },
    thresholds: {
      qualify: 65,
      priority: 80,
      disqualify: 25,
    },
  },

  approvals: {
    outreach: {
      required: true,
      assignTo: 'sales_team',
      timeoutHours: 48,
    },
    quote: {
      required: false,
      autoApproveBelow: 5000,
    },
    content: {
      required: true,
      assignTo: 'marketing_team',
      timeoutHours: 72,
    },
  },

  actions: {
    onQualified: ['notify_slack', 'create_task'],
    onApproved: ['send_email', 'update_crm'],
    onWon: ['create_quote', 'update_crm', 'notify_slack'],
    onLost: ['tag_entity', 'update_crm'],
  },
};
