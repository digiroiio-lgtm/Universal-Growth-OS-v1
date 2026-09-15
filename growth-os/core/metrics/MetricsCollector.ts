import type { Metric, MetricPeriod, MetricSummary } from '../types/index.js';

export class MetricsCollector {
  private metrics: Metric[] = [];

  record(
    partial: Omit<Metric, 'id' | 'createdAt'>
  ): Metric {
    const metric: Metric = {
      ...partial,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    this.metrics.push(metric);
    return metric;
  }

  increment(
    businessId: string,
    name: string,
    amount = 1,
    dimensions: Record<string, string> = {},
    agentId?: string
  ): void {
    const now = new Date();
    const periodStart = this.periodStart(now, 'daily');
    const periodEnd = this.periodEnd(now, 'daily');

    const existing = this.metrics.find(
      m =>
        m.businessId === businessId &&
        m.name === name &&
        m.period === 'daily' &&
        m.periodStart.toDateString() === periodStart.toDateString() &&
        JSON.stringify(m.dimensions) === JSON.stringify(dimensions)
    );

    if (existing) {
      existing.value += amount;
    } else {
      this.record({
        businessId,
        agentId,
        name,
        value: amount,
        unit: 'count',
        dimensions,
        period: 'daily',
        periodStart,
        periodEnd,
      });
    }
  }

  summarize(businessId: string, name: string): MetricSummary {
    const now = new Date();
    const thisStart = this.periodStart(now, 'daily');

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const prevStart = this.periodStart(yesterday, 'daily');

    const current = this.sumPeriod(businessId, name, thisStart);
    const previous = this.sumPeriod(businessId, name, prevStart);
    const change = current - previous;
    const changePercent = previous > 0 ? Math.round((change / previous) * 100) : 0;

    return {
      name,
      current,
      previous,
      change,
      changePercent,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
    };
  }

  query(businessId: string, name: string, period: MetricPeriod): Metric[] {
    return this.metrics.filter(
      m => m.businessId === businessId && m.name === name && m.period === period
    );
  }

  private sumPeriod(businessId: string, name: string, periodStart: Date): number {
    return this.metrics
      .filter(
        m =>
          m.businessId === businessId &&
          m.name === name &&
          m.periodStart.toDateString() === periodStart.toDateString()
      )
      .reduce((sum, m) => sum + m.value, 0);
  }

  private periodStart(date: Date, period: MetricPeriod): Date {
    const d = new Date(date);
    if (period === 'daily') {
      d.setHours(0, 0, 0, 0);
    } else if (period === 'hourly') {
      d.setMinutes(0, 0, 0);
    } else if (period === 'weekly') {
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
    } else if (period === 'monthly') {
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
    }
    return d;
  }

  private periodEnd(date: Date, period: MetricPeriod): Date {
    const d = this.periodStart(date, period);
    if (period === 'daily') d.setDate(d.getDate() + 1);
    else if (period === 'hourly') d.setHours(d.getHours() + 1);
    else if (period === 'weekly') d.setDate(d.getDate() + 7);
    else if (period === 'monthly') d.setMonth(d.getMonth() + 1);
    return d;
  }
}
