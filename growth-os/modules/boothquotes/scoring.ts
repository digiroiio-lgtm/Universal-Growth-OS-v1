import type { ScoringModel } from '../../core/types/index.js';

export const boothquotesScoringModel: Omit<ScoringModel, 'id' | 'createdAt' | 'updatedAt'> = {
  businessId: 'boothquotes',
  name: 'BoothQuotes Trade Show Scoring v1',
  entityTypes: ['trade_show'],
  active: true,
  version: 1,
  weights: {
    attendeeCount: 0.25,
    industryMatch: 0.30,
    geographyScore: 0.20,
    timeToEvent: 0.15,
    exhibitorCount: 0.10,
  },
  signals: [
    {
      key: 'attendeeCount',
      label: 'Expected Attendees',
      maxPoints: 100,
      evaluator: 'scale_10k',
      // 10k+ = 100pts, 5k = 50pts, 1k = 10pts
    },
    {
      key: 'industryMatch',
      label: 'Industry Alignment',
      maxPoints: 100,
      evaluator: 'industry_match',
    },
    {
      key: 'geographyScore',
      label: 'Geography (US focus)',
      maxPoints: 100,
      evaluator: 'geography_us',
    },
    {
      key: 'timeToEvent',
      label: 'Days Until Event',
      maxPoints: 100,
      evaluator: 'time_window_90',
      // 30-90 days out = optimal (100pts), <14 days = 20pts, >180 days = 40pts
    },
    {
      key: 'exhibitorCount',
      label: 'Expected Exhibitors',
      maxPoints: 100,
      evaluator: 'scale_500',
    },
  ],
  thresholds: {
    qualify: 65,
    priority: 80,
    disqualify: 25,
  },
};
