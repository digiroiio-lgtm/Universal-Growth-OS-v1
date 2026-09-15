// ─── Business (Tenant) ────────────────────────────────────────────────────────

export interface Business {
  id: string;
  name: string;
  slug: string;
  config: BusinessConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessConfig {
  modules: string[];
  enabledAgents: string[];
  defaultScoringModel?: string;
  approvalWorkflow?: string;
  timezone?: string;
  notificationChannels?: NotificationChannel[];
}

export interface NotificationChannel {
  type: 'slack' | 'email' | 'webhook';
  target: string;
  events: string[];
}

// ─── Entity ───────────────────────────────────────────────────────────────────
// A company, contact, event, or any tracked object

export interface Entity {
  id: string;
  businessId: string;
  type: EntityType;
  name: string;
  data: Record<string, unknown>;
  source: string;
  sourceId?: string;
  score?: number;
  status: EntityStatus;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type EntityType =
  | 'company'
  | 'contact'
  | 'trade_show'
  | 'event'
  | 'opportunity'
  | 'keyword'
  | 'content_gap';

export type EntityStatus =
  | 'new'
  | 'enriched'
  | 'scored'
  | 'qualified'
  | 'disqualified'
  | 'in_outreach'
  | 'won'
  | 'lost'
  | 'archived';

// ─── Agent Definition ─────────────────────────────────────────────────────────

export interface AgentDefinition {
  id: string;
  businessId: string;
  name: string;
  agentType: string;
  description: string;
  config: AgentConfig;
  schedule?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentConfig {
  inputs: Record<string, unknown>;
  outputTypes: EntityType[];
  rules?: AgentRule[];
  prompts?: Record<string, string>;
  thresholds?: Record<string, number>;
  rateLimits?: RateLimitConfig;
}

export interface AgentRule {
  id: string;
  condition: string;
  action: string;
  params?: Record<string, unknown>;
}

export interface RateLimitConfig {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
}

// ─── Agent Task ───────────────────────────────────────────────────────────────

export interface AgentTask {
  id: string;
  businessId: string;
  agentId: string;
  runId: string;
  type: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: TaskStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  error?: string;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'needs_approval';

// ─── Agent State ──────────────────────────────────────────────────────────────

export interface AgentState {
  agentId: string;
  businessId: string;
  runId: string;
  phase: string;
  memory: Record<string, unknown>;
  checkpoints: StateCheckpoint[];
  updatedAt: Date;
}

export interface StateCheckpoint {
  phase: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

// ─── Agent Run ────────────────────────────────────────────────────────────────

export interface AgentRun {
  id: string;
  businessId: string;
  agentId: string;
  status: RunStatus;
  trigger: RunTrigger;
  input: Record<string, unknown>;
  output?: AgentRunOutput;
  tasksTotal: number;
  tasksCompleted: number;
  tasksFailed: number;
  entitiesDiscovered: number;
  entitiesActioned: number;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface AgentRunOutput {
  entities: Entity[];
  opportunities: Opportunity[];
  actions: Action[];
  metrics: Record<string, number>;
  summary: string;
}

export type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type RunTrigger = 'scheduled' | 'manual' | 'event' | 'api';

// ─── Events ───────────────────────────────────────────────────────────────────

export interface GrowthEvent {
  id: string;
  businessId: string;
  type: GrowthEventType;
  source: string;
  entityId?: string;
  agentId?: string;
  runId?: string;
  opportunityId?: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export type GrowthEventType =
  | 'entity.discovered'
  | 'entity.enriched'
  | 'entity.scored'
  | 'entity.qualified'
  | 'entity.disqualified'
  | 'opportunity.created'
  | 'opportunity.approved'
  | 'opportunity.rejected'
  | 'opportunity.won'
  | 'opportunity.lost'
  | 'agent.run.started'
  | 'agent.run.completed'
  | 'agent.run.failed'
  | 'approval.requested'
  | 'approval.granted'
  | 'approval.denied'
  | 'action.executed'
  | 'action.failed';

// ─── Opportunity ──────────────────────────────────────────────────────────────

export interface Opportunity {
  id: string;
  businessId: string;
  entityId: string;
  type: string;
  title: string;
  description: string;
  score: number;
  confidence: number;
  estimatedValue?: number;
  stage: OpportunityStage;
  assignedTo?: string;
  agentId: string;
  runId: string;
  data: Record<string, unknown>;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type OpportunityStage =
  | 'identified'
  | 'qualified'
  | 'pending_approval'
  | 'approved'
  | 'in_outreach'
  | 'responded'
  | 'won'
  | 'lost';

// ─── Scoring ──────────────────────────────────────────────────────────────────

export interface ScoringModel {
  id: string;
  businessId: string;
  name: string;
  entityTypes: EntityType[];
  weights: Record<string, number>;
  signals: ScoringSignal[];
  thresholds: ScoringThresholds;
  version: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScoringSignal {
  key: string;
  label: string;
  maxPoints: number;
  evaluator: string;
}

export interface ScoringThresholds {
  qualify: number;
  priority: number;
  disqualify: number;
}

export interface ScoringResult {
  id: string;
  businessId: string;
  entityId?: string;
  opportunityId?: string;
  modelId: string;
  score: number;
  breakdown: Record<string, number>;
  recommendation: 'qualify' | 'deprioritize' | 'disqualify';
  confidence: number;
  reasoning: string;
  createdAt: Date;
}

// ─── Approval Queue ───────────────────────────────────────────────────────────

export interface ApprovalItem {
  id: string;
  businessId: string;
  type: ApprovalType;
  entityId?: string;
  opportunityId?: string;
  taskId?: string;
  requestedBy: string;
  summary: string;
  data: Record<string, unknown>;
  status: ApprovalStatus;
  reviewedBy?: string;
  reviewNote?: string;
  expiresAt?: Date;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ApprovalType = 'outreach' | 'content' | 'opportunity' | 'action' | 'budget';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

// ─── Actions ──────────────────────────────────────────────────────────────────

export interface Action {
  id: string;
  businessId: string;
  type: ActionType;
  entityId?: string;
  opportunityId?: string;
  agentId?: string;
  approvalId?: string;
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: ActionStatus;
  error?: string;
  executedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ActionType =
  | 'send_email'
  | 'send_linkedin'
  | 'create_quote'
  | 'update_crm'
  | 'notify_slack'
  | 'enrich_entity'
  | 'tag_entity'
  | 'create_task'
  | string;

export type ActionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

// ─── Metrics ──────────────────────────────────────────────────────────────────

export interface Metric {
  id: string;
  businessId: string;
  agentId?: string;
  name: string;
  value: number;
  unit: string;
  dimensions: Record<string, string>;
  period: MetricPeriod;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}

export type MetricPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface MetricSummary {
  name: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'flat';
}

// ─── Module Config ────────────────────────────────────────────────────────────
// Every business module declares one of these

export interface BusinessModuleConfig {
  id: string;
  name: string;
  description: string;
  agents: ModuleAgentConfig[];
  scoring: ModuleScoringConfig;
  approvals: ModuleApprovalConfig;
  actions: ModuleActionConfig;
  entityTypes: EntityType[];
}

export interface ModuleAgentConfig {
  agentType: string;
  enabled: boolean;
  schedule?: string;
  config: Record<string, unknown>;
}

export interface ModuleScoringConfig {
  model: string;
  weights: Record<string, number>;
  thresholds: ScoringThresholds;
}

export interface ModuleApprovalConfig {
  [key: string]: {
    required: boolean;
    assignTo?: string;
    timeoutHours?: number;
    autoApproveBelow?: number;
  };
}

export interface ModuleActionConfig {
  onQualified: ActionType[];
  onApproved: ActionType[];
  onWon?: ActionType[];
  onLost?: ActionType[];
}
