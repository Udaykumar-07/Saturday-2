/**
 * Provider Evaluation Service for Saturday Intelligence System.
 *
 * Gathers multi-dimensional evidence (benchmarks, internal evaluations,
 * latency, cost, reliability, feedback) to build detailed candidate evaluations.
 */

import {
  IntelligenceProviderEntry,
  ProviderCandidateEvaluation,
} from '../../core/types/intelligence';
import { TaskRequirements } from '../../core/types/external';
import { calculateCapabilityCoverage } from '../registry/CapabilityTaxonomy';
import { BenchmarkStore } from '../benchmarks/BenchmarkStore';
import { SaturdayEvaluationEngine } from '../evaluation/SaturdayEvaluationEngine';
import { LatencyTracker } from '../performance/LatencyTracker';
import { CostEstimator } from '../cost/CostEstimator';
import { PrivacyRouter } from '../privacy/PrivacyRouter';
import { RoutingFeedbackService } from '../feedback/RoutingFeedbackService';
import { RoutingScorer } from './RoutingScorer';

export class ProviderEvaluationService {
  constructor(
    private benchmarkStore: BenchmarkStore,
    private evalEngine: SaturdayEvaluationEngine,
    private latencyTracker: LatencyTracker,
    private costEstimator: CostEstimator,
    private privacyRouter: PrivacyRouter,
    private feedbackService: RoutingFeedbackService,
    private scorer: RoutingScorer
  ) {}

  /**
   * Evaluate a set of candidate providers against specific task requirements.
   */
  evaluate(
    requirements: TaskRequirements,
    candidates: IntelligenceProviderEntry[]
  ): ProviderCandidateEvaluation[] {
    const results: ProviderCandidateEvaluation[] = [];

    for (const provider of candidates) {
      // 1. Capability Match
      const reqCaps = requirements.capabilities || [];
      const provCaps = provider.capabilities.map((c) => c.id);
      const capabilityMatch = calculateCapabilityCoverage(reqCaps, provCaps);

      // 2. Benchmark Evidence
      let benchmarkEvidence = 0.5; // neutral baseline
      const bms = this.benchmarkStore.getBenchmarks(provider.id);
      if (bms.length > 0) {
        const scores = bms.map((b) => b.normalizedScore ?? 0.5);
        benchmarkEvidence = scores.reduce((a, b) => a + b, 0) / scores.length;
      }

      // 3. Internal Evaluation Score
      const evaluationScore = this.evalEngine.getOverallScore(provider.id);

      // 4. Reliability
      const reliability =
        provider.reliabilityProfile.recentSuccessRate ??
        provider.reliabilityProfile.successRate ??
        0.9;

      // 5. Latency Score
      const latency = this.latencyTracker.calculateLatencyScore(
        provider.id,
        provider.latencyProfile.averageMs ?? 1500
      );

      // 6. Cost Efficiency
      const cost = this.costEstimator.calculateCostEfficiency(
        provider,
        requirements,
        requirements.costMode || 'BALANCED'
      );

      // 7. Privacy Alignment
      const privacy = this.privacyRouter.calculatePrivacyScore(provider, requirements);

      // 8. Availability
      let availability = 0.0;
      if (provider.state === 'ACTIVE') availability = 1.0;
      else if (provider.state === 'DEGRADED') availability = 0.6;
      else if (provider.state === 'STALE') availability = 0.7;

      // 9. Freshness Capability
      let freshness = 0.5;
      if (requirements.freshInformationRequired || requirements.requiresCurrentData) {
        // If task requires fresh info, check if provider has web search or research support
        freshness = provider.researchSupport || provCaps.includes('WEB_SEARCH') || provCaps.includes('RESEARCH') ? 1.0 : 0.1;
      } else {
        freshness = 0.8;
      }

      // 10. Historical Success from feedback loop
      const historicalSuccess = this.feedbackService.calculateHistoricalSuccessScore(provider.id);

      const candidateEval: ProviderCandidateEvaluation = {
        providerId: provider.id,
        capabilityMatch,
        benchmarkEvidence,
        evaluationScore,
        reliability,
        latency,
        cost,
        privacy,
        availability,
        freshness,
        historicalSuccess,
        overallScore: 0,
        rejected: false,
      };

      candidateEval.overallScore = this.scorer.score(candidateEval);
      results.push(candidateEval);
    }

    // Sort descending by overall score
    return results.sort((a, b) => b.overallScore - a.overallScore);
  }
}
