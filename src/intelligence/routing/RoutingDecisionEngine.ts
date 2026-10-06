/**
 * Routing Decision Engine for Saturday.
 *
 * Implements the core dynamic intelligence selection pipeline:
 * User Intention -> Task Requirements -> Hard Constraints -> Candidate Filtering
 * -> Evidence Evaluation -> Optimization -> Routing Decision -> Fallback Selection.
 */

import {
  DataFreshness,
  ExecutionTarget,
  IntelligenceProviderEntry,
  RoutingDecision,
} from '../../core/types/intelligence';
import { TaskRequirements } from '../../core/types/external';
import { IntelligenceRegistry } from '../registry/IntelligenceRegistry';
import { HardConstraintFilter } from './HardConstraintFilter';
import { ProviderEvaluationService } from './ProviderEvaluationService';
import { BenchmarkStore } from '../benchmarks/BenchmarkStore';
import { CredentialStore } from '../../core/external/authentication/CredentialStore';

export class RoutingDecisionEngine {
  constructor(
    private registry: IntelligenceRegistry,
    private hardConstraintFilter: HardConstraintFilter,
    private evaluationService: ProviderEvaluationService,
    private benchmarkStore: BenchmarkStore,
    private credentialStore: CredentialStore
  ) {}

  /**
   * Decide the optimal execution strategy and intelligence source for a task.
   */
  async decide(requirements: TaskRequirements): Promise<RoutingDecision> {
    // 1. Candidate Discovery from Registry
    const allCandidates = this.registry.getActiveProviders();

    // 2. Hard Constraint Filtering (reject localOnly violations, privacy mismatches, missing required capabilities)
    const { passed, rejected } = this.hardConstraintFilter.filter(
      allCandidates,
      requirements
    );

    if (passed.length === 0) {
      // No providers satisfied hard constraints
      const fallbackExplanation =
        rejected.length > 0
          ? `No available provider satisfied all constraints: ${rejected.map((r) => `${r.providerId} (${r.reason})`).join('; ')}`
          : 'No active intelligence providers found.';

      return {
        selectedProvider: 'local',
        executionTarget: 'LOCAL',
        requiredCapabilities: requirements.capabilities || [],
        rejectedCandidates: rejected,
        decisionFactors: {},
        confidence: 0.1,
        dataFreshness: 'UNKNOWN',
        requiresConfirmation: false,
        requiresAuthentication: false,
        explanation: fallbackExplanation,
      };
    }

    // 3. Multi-dimensional Evaluation of valid candidates
    const evaluations = this.evaluationService.evaluate(requirements, passed);
    const topCandidateEval = evaluations[0];
    const topProvider = this.registry.getProvider(topCandidateEval.providerId)!;

    // Fallback candidate (second best)
    const fallbackProvider =
      evaluations.length > 1 ? evaluations[1].providerId : undefined;

    // 4. Map provider to ExecutionTarget
    const executionTarget = this.determineExecutionTarget(
      topProvider,
      requirements
    );

    // 5. Data Freshness Check
    const freshness: DataFreshness = this.benchmarkStore.getFreshness(topProvider.id);

    // 6. User confirmation & authentication requirements
    const requiresConfirmation =
      requirements.privacyLevel === 'private' && topProvider.type !== 'LOCAL_MODEL' && topProvider.type !== 'TOOL';

    const requiresAuthentication =
      requirements.requiresAuthentication || topProvider.id.includes('gmail');

    // 7. Check provider availability (credentials configured)
    if (['openai_provider', 'anthropic_provider', 'google_gemini_provider'].includes(topProvider.id)) {
      const available = await this.checkProviderAvailability(topProvider.id);
      if (!available) {
        const providerName = topProvider.name;
        return {
          selectedProvider: topProvider.id,
          executionTarget,
          requiredCapabilities: requirements.capabilities || [],
          rejectedCandidates: rejected,
          decisionFactors: {
            capabilityMatch: topCandidateEval.capabilityMatch,
            overallScore: topCandidateEval.overallScore,
            reliability: topCandidateEval.reliability,
            latency: topCandidateEval.latency,
            cost: topCandidateEval.cost,
            privacy: topCandidateEval.privacy,
          },
          fallbackProvider,
          confidence: topCandidateEval.overallScore,
          dataFreshness: freshness,
          requiresConfirmation,
          requiresAuthentication,
          requiresConfiguration: true,
          unconfiguredProviderId: topProvider.id,
          explanation: `${providerName} requires configuration before use.`,
        };
      }
    }

    // 8. Human-readable explanation
    const explanation = this.generateExplanation(
      topProvider,
      executionTarget,
      requirements
    );

    return {
      selectedProvider: topProvider.id,
      executionTarget,
      requiredCapabilities: requirements.capabilities || [],
      rejectedCandidates: rejected,
      decisionFactors: {
        capabilityMatch: topCandidateEval.capabilityMatch,
        overallScore: topCandidateEval.overallScore,
        reliability: topCandidateEval.reliability,
        latency: topCandidateEval.latency,
        cost: topCandidateEval.cost,
        privacy: topCandidateEval.privacy,
      },
      fallbackProvider,
      confidence: topCandidateEval.overallScore,
      dataFreshness: freshness,
      requiresConfirmation,
      requiresAuthentication,
      explanation,
    };
  }

  /**
   * Check if a provider is available (has credentials configured).
   */
  async checkProviderAvailability(providerId: string): Promise<boolean> {
    if (providerId === 'openai_provider' || providerId === 'anthropic_provider' || providerId === 'google_gemini_provider') {
      return this.credentialStore.has(providerId);
    }
    return true;
  }

  /**
   * Estimate cost for a given task and provider.
   */
  estimateCost(requirements: TaskRequirements, providerId: string): number {
    const provider = this.registry.getProvider(providerId);
    if (!provider) return 0;

    const costProfile = provider.costProfile;
    if (!costProfile.inputCostPer1kTokens) return 0;

    // Rough estimate: assume 500 input tokens and 500 output tokens
    const estimatedInputTokens = 500;
    const estimatedOutputTokens = 500;

    const inputCost = (estimatedInputTokens / 1000) * costProfile.inputCostPer1kTokens;
    const outputCost = costProfile.outputCostPer1kTokens
      ? (estimatedOutputTokens / 1000) * costProfile.outputCostPer1kTokens
      : 0;

    return inputCost + outputCost;
  }

  /**
   * Determine ExecutionTarget from provider characteristics and task requirements.
   */
  private determineExecutionTarget(
    provider: IntelligenceProviderEntry,
    requirements: TaskRequirements
  ): ExecutionTarget {
    if (requirements.multiStep && requirements.capabilities.length > 1) {
      return 'MULTI_STEP';
    }

    switch (provider.type) {
      case 'LOCAL_MODEL':
        return 'LOCAL';
      case 'TOOL':
        return 'ANDROID_ACTION';
      case 'API':
        return 'API';
      case 'AGENT':
        return 'EXTERNAL_AGENT';
      case 'CLOUD_MODEL':
        return 'EXTERNAL_MODEL';
      default:
        return 'LOCAL';
    }
  }

  /**
   * Generate clean explanation of the routing rationale.
   */
  private generateExplanation(
    provider: IntelligenceProviderEntry,
    target: ExecutionTarget,
    requirements: TaskRequirements
  ): string {
    if (target === 'LOCAL' || target === 'ANDROID_ACTION') {
      return `Handling locally on your device via ${provider.name}.`;
    }
    if (target === 'API') {
      return `Connecting to ${provider.name} to retrieve your data.`;
    }
    if (target === 'EXTERNAL_AGENT') {
      return `Delegating to ${provider.name} for research and multi-step execution.`;
    }
    if (target === 'EXTERNAL_MODEL') {
      return `Using ${provider.name} for high-capacity reasoning.`;
    }
    return `Executing via ${provider.name}.`;
  }
}
