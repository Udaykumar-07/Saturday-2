/**
 * Phase 4: Intelligence System Types.
 *
 * Defines all types for Saturday's dynamic intelligence selection system.
 * These types describe intelligence providers, capabilities, benchmarks,
 * evaluations, routing decisions, and feedback — enabling Saturday to
 * automatically select the best intelligence source for any task.
 */

import type { ExecutionTarget, TaskRequirements } from './external';

export type { ExecutionTarget };

// ═══════════════════════════════════════════════════════════════
//  CAPABILITY TAXONOMY
// ═══════════════════════════════════════════════════════════════

/**
 * Normalized capability identifier.
 * The string union provides IDE autocompletion for well-known capabilities,
 * while `(string & {})` allows any custom capability to be added later.
 */
export type IntelligenceCapabilityId =
  | 'TEXT_GENERATION'
  | 'REASONING'
  | 'DEEP_REASONING'
  | 'CODING'
  | 'DEBUGGING'
  | 'VISION'
  | 'IMAGE_ANALYSIS'
  | 'AUDIO_ANALYSIS'
  | 'TRANSCRIPTION'
  | 'TRANSLATION'
  | 'SUMMARIZATION'
  | 'RESEARCH'
  | 'WEB_SEARCH'
  | 'WEB_BROWSING'
  | 'LONG_CONTEXT'
  | 'STRUCTURED_OUTPUT'
  | 'FUNCTION_CALLING'
  | 'TOOL_USE'
  | 'AGENTIC_EXECUTION'
  | 'PLANNING'
  | 'MULTI_STEP_EXECUTION'
  | 'ANDROID_CONTROL'
  | 'EMAIL_ACCESS'
  | 'CALENDAR_ACCESS'
  | 'MAPS'
  | 'SHOPPING'
  | 'BOOKING'
  | 'DOCUMENT_ANALYSIS'
  | 'PRIVATE_DATA_PROCESSING'
  | 'MEDIA_PLAYBACK'
  | 'APP_MANAGEMENT'
  | 'DEVICE_INFO'
  | (string & {}); // extensible

/**
 * Capability category for grouping.
 */
export type IntelligenceCapabilityCategory =
  | 'generation'
  | 'reasoning'
  | 'coding'
  | 'media'
  | 'research'
  | 'tools'
  | 'device'
  | 'communication'
  | 'services'
  | 'privacy'
  | (string & {});

// ═══════════════════════════════════════════════════════════════
//  PROVIDER TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Intelligence source classification.
 */
export type IntelligenceSourceType =
  | 'LOCAL_MODEL'
  | 'CLOUD_MODEL'
  | 'AGENT'
  | 'API'
  | 'TOOL';

/**
 * Provider lifecycle state.
 */
export type IntelligenceProviderState =
  | 'DISCOVERED'
  | 'ACTIVE'
  | 'DEGRADED'
  | 'UNAVAILABLE'
  | 'STALE'
  | 'DEPRECATED'
  | 'DISABLED';

/**
 * Privacy profile for a provider.
 */
export interface PrivacyProfile {
  /** Privacy level: local keeps data on device, private limits sharing, standard is default */
  level: 'local' | 'private' | 'standard';
  /** How long the provider retains user data */
  dataRetentionPolicy: 'none' | 'session' | 'temporary' | 'persistent' | 'unknown';
  /** Whether data leaves the device */
  sendsDataExternally: boolean;
  /** Where data is processed */
  storageLocation: 'device' | 'cloud' | 'hybrid' | 'unknown';
}

/**
 * Cost profile for a provider.
 */
export interface CostProfile {
  /** Cost per 1k input tokens in the specified currency */
  inputCostPer1kTokens?: number;
  /** Cost per 1k output tokens */
  outputCostPer1kTokens?: number;
  /** ISO currency code */
  currency?: string;
  /** When pricing was last updated */
  pricingTimestamp?: number;
  /** High-level cost tier for when exact pricing is unknown */
  costTier: 'free' | 'low' | 'medium' | 'high' | 'unknown';
}

/**
 * Latency profile based on measurements.
 */
export interface LatencyProfile {
  /** Average response time in milliseconds */
  averageMs?: number;
  /** 50th percentile latency */
  p50Ms?: number;
  /** 95th percentile latency */
  p95Ms?: number;
  /** Time to first token for streaming providers */
  timeToFirstTokenMs?: number;
  /** When these measurements were taken */
  measuredAt?: number;
}

/**
 * Reliability profile based on historical observations.
 */
export interface ReliabilityProfile {
  /** Overall success rate (0-1) */
  successRate: number;
  /** Overall failure rate (0-1) */
  failureRate: number;
  /** Recent success rate within a time window */
  recentSuccessRate?: number;
  /** Number of observations this is based on */
  sampleSize: number;
  /** When this was last calculated */
  lastMeasured?: number;
}

/**
 * Capability entry within a provider record.
 */
export interface ProviderCapability {
  /** Normalized capability ID */
  id: IntelligenceCapabilityId;
  /** Category for grouping */
  category: IntelligenceCapabilityCategory;
  /** Quality score for this specific capability (0-1) */
  score?: number;
}

/**
 * Full provider entry in the Intelligence Registry.
 * Describes everything Saturday knows about an intelligence source.
 */
export interface IntelligenceProviderEntry {
  /** Unique provider identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Provider type classification */
  type: IntelligenceSourceType;
  /** What this provider can do */
  capabilities: ProviderCapability[];
  /** Supported input formats */
  inputTypes: string[];
  /** Supported output formats */
  outputTypes: string[];
  /** Maximum reasoning depth */
  reasoningLevel: 'none' | 'basic' | 'advanced' | 'deep';
  /** Maximum context window in tokens (0 if not applicable) */
  contextWindow: number;
  /** Whether the provider supports vision/image input */
  visionSupport: boolean;
  /** Coding task proficiency */
  codingSupport: boolean;
  /** Research/web-search capability */
  researchSupport: boolean;
  /** Autonomous agent execution */
  agenticSupport: boolean;
  /** Whether streaming responses are supported */
  supportsStreaming: boolean;
  /** Whether structured/JSON output is supported */
  supportsStructuredOutput: boolean;
  /** Whether function/tool calling is supported */
  supportsFunctionCalling: boolean;
  /** Privacy characteristics */
  privacyProfile: PrivacyProfile;
  /** Cost characteristics */
  costProfile: CostProfile;
  /** Measured latency data */
  latencyProfile: LatencyProfile;
  /** Measured reliability data */
  reliabilityProfile: ReliabilityProfile;
  /** Current lifecycle state */
  state: IntelligenceProviderState;
  /** When this entry was last updated (unix ms) */
  lastUpdated: number;
  /** Where this metadata came from */
  source: string;
  /** Provider version string */
  version: string;
}

// ═══════════════════════════════════════════════════════════════
//  BENCHMARKS
// ═══════════════════════════════════════════════════════════════

/**
 * A single benchmark observation for a provider.
 */
export interface BenchmarkRecord {
  /** Unique benchmark record ID */
  id: string;
  /** Provider this benchmark applies to */
  providerId: string;
  /** Capability being benchmarked */
  capability: IntelligenceCapabilityId;
  /** Name of the benchmark (e.g. "HumanEval", "MMLU") */
  benchmarkName: string;
  /** Raw score value */
  score: number;
  /** Metric used (e.g. "accuracy", "pass@1") */
  metric: string;
  /** Task category the benchmark measures */
  taskCategory: string;
  /** Where this data came from */
  source: string;
  /** URL for verification */
  sourceUrl?: string;
  /** When this benchmark was published/measured */
  timestamp: number;
  /** Confidence in this data (0-1) */
  confidence: number;
  /** Score normalized to 0-1 range for cross-benchmark comparison */
  normalizedScore?: number;
}

// ═══════════════════════════════════════════════════════════════
//  EVALUATION
// ═══════════════════════════════════════════════════════════════

/**
 * A single evaluation task.
 */
export interface EvaluationTask {
  /** Unique task ID */
  id: string;
  /** Evaluation category */
  category: string;
  /** Input to send to the provider */
  input: string;
  /** What the provider should ideally do */
  expectedBehavior: string;
  /** How to evaluate the output */
  evaluationCriteria: string;
}

/**
 * Result of running one evaluation task against one provider.
 */
export interface EvaluationResult {
  /** Task that was evaluated */
  taskId: string;
  /** Provider that was tested */
  providerId: string;
  /** Score (0-1) */
  score: number;
  /** How long the provider took */
  latencyMs: number;
  /** Whether the evaluation succeeded */
  success: boolean;
  /** Raw output from the provider */
  output?: string;
  /** When this evaluation was run */
  timestamp: number;
}

/**
 * A complete evaluation run (multiple tasks against one provider).
 */
export interface EvaluationRun {
  /** Unique run ID */
  id: string;
  /** Suite that was executed */
  suiteId: string;
  /** Provider that was evaluated */
  providerId: string;
  /** Individual task results */
  results: EvaluationResult[];
  /** Aggregate score across all tasks */
  overallScore: number;
  /** When the run started */
  startedAt: number;
  /** When the run completed */
  completedAt: number;
}

/**
 * An evaluation suite definition.
 */
export interface EvaluationSuiteDefinition {
  /** Unique suite ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Category being evaluated */
  category: string;
  /** Tasks in this suite */
  tasks: EvaluationTask[];
  /** Budget level */
  budget: 'light' | 'full' | 'on_demand';
}

// ═══════════════════════════════════════════════════════════════
//  ROUTING
// ═══════════════════════════════════════════════════════════════

/**
 * Multi-dimensional evaluation of a single provider candidate.
 */
export interface ProviderCandidateEvaluation {
  /** Provider being evaluated */
  providerId: string;
  /** How well capabilities match (0-1) */
  capabilityMatch: number;
  /** Evidence from benchmarks (0-1) */
  benchmarkEvidence: number;
  /** Evidence from Saturday's internal evaluations (0-1) */
  evaluationScore: number;
  /** Historical reliability (0-1) */
  reliability: number;
  /** Latency score (0-1, higher = faster) */
  latency: number;
  /** Cost efficiency (0-1, higher = cheaper) */
  cost: number;
  /** Privacy compatibility (0-1) */
  privacy: number;
  /** Current availability (0-1) */
  availability: number;
  /** Data freshness capability (0-1) */
  freshness: number;
  /** Historical task success rate (0-1) */
  historicalSuccess: number;
  /** Weighted overall score */
  overallScore: number;
  /** Whether this candidate was rejected by hard constraints */
  rejected: boolean;
  /** Why it was rejected, if applicable */
  rejectionReason?: string;
}

/**
 * Configurable weights for routing score dimensions.
 */
export interface RoutingWeights {
  capabilityMatch: number;
  benchmarkEvidence: number;
  evaluationScore: number;
  reliability: number;
  latency: number;
  cost: number;
  privacy: number;
  availability: number;
  freshness: number;
  historicalSuccess: number;
}

/**
 * A rejected candidate with its reason.
 */
export interface RejectedCandidate {
  providerId: string;
  reason: string;
}

/**
 * The final routing decision.
 */
export interface RoutingDecision {
  /** Selected provider ID */
  selectedProvider: string;
  /** Execution target type */
  executionTarget: ExecutionTarget;
  /** Capabilities required for this task */
  requiredCapabilities: string[];
  /** Candidates that were rejected and why */
  rejectedCandidates: RejectedCandidate[];
  /** Factors that influenced the decision */
  decisionFactors: Record<string, number>;
  /** Backup provider if primary fails */
  fallbackProvider?: string;
  /** Confidence in this decision (0-1) */
  confidence: number;
  /** How fresh the decision data is */
  dataFreshness: DataFreshness;
  /** Whether user confirmation is needed */
  requiresConfirmation: boolean;
  /** Whether authentication is needed */
  requiresAuthentication: boolean;
  /** Human-readable explanation */
  explanation: string;
}

/**
 * Cost mode preference.
 */
export type CostMode =
  | 'FREE_PREFERRED'
  | 'BALANCED'
  | 'QUALITY_PREFERRED'
  | 'NO_COST_LIMIT';

/**
 * Data freshness classification.
 */
export type DataFreshness = 'FRESH' | 'STALE' | 'EXPIRED' | 'UNKNOWN';

/**
 * Cost estimate for a task.
 */
export interface CostEstimate {
  /** Estimated input cost */
  estimatedInputCost?: number;
  /** Estimated output cost */
  estimatedOutputCost?: number;
  /** Total estimated cost */
  estimatedTaskCost?: number;
  /** Currency */
  currency?: string;
  /** Whether cost data is unavailable */
  unknown: boolean;
}

// ═══════════════════════════════════════════════════════════════
//  FEEDBACK
// ═══════════════════════════════════════════════════════════════

/**
 * Feedback recorded after a routing decision is executed.
 */
export interface RoutingFeedback {
  /** Unique feedback ID */
  id: string;
  /** The routing decision this feedback is for */
  routingDecisionId: string;
  /** Provider that was used */
  providerId: string;
  /** Type of task */
  taskType: string;
  /** Whether the task succeeded */
  success: boolean;
  /** Verification result */
  verificationResult?: string;
  /** Actual latency observed */
  latencyMs?: number;
  /** Actual cost incurred */
  cost?: number;
  /** Why it failed, if applicable */
  failureReason?: string;
  /** User correction, if any */
  userCorrection?: string;
  /** When this feedback was recorded */
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════
//  REFRESH & CACHE
// ═══════════════════════════════════════════════════════════════

/**
 * Result of an intelligence data refresh.
 */
export interface RefreshResult {
  /** Number of providers updated */
  providersUpdated: number;
  /** Number of benchmarks updated */
  benchmarksUpdated: number;
  /** Errors encountered during refresh */
  errors: string[];
  /** When refresh completed */
  timestamp: number;
}

/**
 * A cached value with metadata.
 */
export interface CacheEntry<T> {
  /** The cached value */
  value: T;
  /** When it was first cached */
  createdAt: number;
  /** When it was last updated */
  updatedAt: number;
  /** When it expires */
  expiresAt: number;
}

// ═══════════════════════════════════════════════════════════════
//  DISCOVERY
// ═══════════════════════════════════════════════════════════════

/**
 * Adapter interface for intelligence source discovery.
 */
export interface IntelligenceSourceAdapterSpec {
  /** Unique adapter ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Fetch available provider entries */
  fetchProviders(): Promise<IntelligenceProviderEntry[]>;
  /** Optionally fetch benchmark data */
  fetchBenchmarks?(): Promise<BenchmarkRecord[]>;
  /** When this adapter last fetched data */
  lastFetched?: number;
}

/**
 * Metadata validation result.
 */
export interface MetadataValidationResult {
  /** Whether the metadata is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Warnings (non-fatal issues) */
  warnings: string[];
}
