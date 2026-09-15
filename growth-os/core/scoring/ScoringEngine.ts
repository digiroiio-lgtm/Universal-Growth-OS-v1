import type {
  Entity,
  ScoringModel,
  ScoringResult,
  Opportunity,
} from '../types/index.js';

export class ScoringEngine {
  private models = new Map<string, ScoringModel>();

  registerModel(model: ScoringModel): void {
    this.models.set(model.id, model);
  }

  getActiveModel(businessId: string): ScoringModel | undefined {
    return Array.from(this.models.values()).find(
      m => m.businessId === businessId && m.active
    );
  }

  scoreEntity(entity: Entity, modelId: string): ScoringResult {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Scoring model not found: ${modelId}`);

    const breakdown: Record<string, number> = {};
    let totalScore = 0;
    let totalWeight = 0;

    for (const signal of model.signals) {
      const weight = model.weights[signal.key] ?? 0;
      const rawValue = this.extractSignalValue(entity.data, signal.key);
      const points = this.normalizeSignal(rawValue, signal.maxPoints);
      breakdown[signal.key] = Math.round(points * weight * 100) / 100;
      totalScore += breakdown[signal.key];
      totalWeight += weight;
    }

    const score = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) / 100 : 0;
    const recommendation = this.classify(score, model.thresholds);

    return {
      id: crypto.randomUUID(),
      businessId: entity.businessId,
      entityId: entity.id,
      modelId,
      score,
      breakdown,
      recommendation,
      confidence: this.computeConfidence(breakdown, model.signals.length),
      reasoning: this.buildReasoning(breakdown, model, recommendation),
      createdAt: new Date(),
    };
  }

  scoreOpportunity(opp: Opportunity, modelId: string): ScoringResult {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Scoring model not found: ${modelId}`);

    const breakdown: Record<string, number> = {};
    let totalScore = 0;
    let totalWeight = 0;

    for (const signal of model.signals) {
      const weight = model.weights[signal.key] ?? 0;
      const rawValue = this.extractSignalValue(opp.data, signal.key);
      const points = this.normalizeSignal(rawValue, signal.maxPoints);
      breakdown[signal.key] = Math.round(points * weight * 100) / 100;
      totalScore += breakdown[signal.key];
      totalWeight += weight;
    }

    const score = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) / 100 : 0;
    const recommendation = this.classify(score, model.thresholds);

    return {
      id: crypto.randomUUID(),
      businessId: opp.businessId,
      opportunityId: opp.id,
      modelId,
      score,
      breakdown,
      recommendation,
      confidence: this.computeConfidence(breakdown, model.signals.length),
      reasoning: this.buildReasoning(breakdown, model, recommendation),
      createdAt: new Date(),
    };
  }

  private extractSignalValue(data: Record<string, unknown>, key: string): number {
    const val = data[key];
    if (typeof val === 'number') return val;
    if (typeof val === 'boolean') return val ? 1 : 0;
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private normalizeSignal(rawValue: number, maxPoints: number): number {
    return Math.min(rawValue, maxPoints) / maxPoints;
  }

  private classify(
    score: number,
    thresholds: ScoringModel['thresholds']
  ): ScoringResult['recommendation'] {
    if (score <= thresholds.disqualify) return 'disqualify';
    if (score >= thresholds.qualify) return 'qualify';
    return 'deprioritize';
  }

  private computeConfidence(breakdown: Record<string, number>, signalCount: number): number {
    const scored = Object.values(breakdown).filter(v => v > 0).length;
    return Math.round((scored / Math.max(signalCount, 1)) * 100);
  }

  private buildReasoning(
    breakdown: Record<string, number>,
    model: ScoringModel,
    recommendation: ScoringResult['recommendation']
  ): string {
    const top = Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    return `Recommendation: ${recommendation}. Top signals: ${top}`;
  }
}
