// BoothQuotes module-specific types

export interface TradeShow {
  name: string;
  organizer?: string;
  website?: string;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
  state: string;
  country: string;
  industry: string[];
  expectedAttendees?: number;
  expectedExhibitors?: number;
  boothSizeOptions?: string[];
  estimatedBoothCost?: number;
  registrationDeadline?: string;
  previousYearAttendees?: number;
  isRecurring: boolean;
  frequency?: 'annual' | 'biannual' | 'quarterly';
  source: string;
  sourceUrl?: string;
}

export interface SupplyGapOpportunity {
  category: string;
  product: string;
  region: string;
  gapType: 'shortage' | 'price_spike' | 'distributor_exit' | 'new_entrant';
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimatedDemand?: number;
  currentSupply?: number;
  gapPercent?: number;
  sources: string[];
  affectedIndustries: string[];
  detectedAt: string;
}

export interface SEOOpportunity {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  currentRank?: number;
  targetUrl?: string;
  competitorUrls: string[];
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  estimatedTrafficGain?: number;
  recommendedAction: 'create' | 'optimize' | 'build_links';
  contentGap?: string;
}

export interface BoothQuoteEntity extends TradeShow {
  opportunityScore?: number;
  boothsAvailable?: number;
  targetExhibitorCount?: number;
  outreachStatus?: 'not_started' | 'in_progress' | 'completed';
}
