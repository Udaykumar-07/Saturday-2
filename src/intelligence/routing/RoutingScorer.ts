/**
 * Routing Scorer for Saturday Intelligence System.
 *
 * Implements weighted, normalized multi-dimensional scoring across candidate providers.
 * All dimensions are normalized to [0.0, 1.0] before weighting to prevent scale bias.
 */

import {
  ProviderCandidateEvaluation,
  RoutingWeights,
} from '../../core/types/intelligence';

export const DEFAULT_ROUTING_WEIGHTS: RoutingWeights = {
  capabilityMatch: 0.25,    // Core capability coverage
  benchmarkEvidence: 0.10,  // External benchmark data
  evaluationScore: 0.10,    // Internal empirical evaluations
  reliability: 0.15,        // Historical reliability / uptime
  latency: 0.10,            // Speed / responsiveness
  cost: 0.05,               // Cost efficiency
  privacy: 0.10,            // Privacy alignment
  availability: 0.05,       // Current reachability
  freshness: 0.05,          // Information recency
  historicalSuccess: 0.05,  // Specific task outcome feedback
};

export class RoutingScorer {
  private weights: RoutingWeights;

  constructor(weights: Partial<RoutingWeights> = {}) {
    this.weights = { ...DEFAULT_ROUTING_WEIGHTS, ...weights };
  }

  /**
   * Compute final normalized composite score for an evaluation candidate.
   *
   * Formula:
   * Score = Σ (normalized_dimension_i * weight_i) / Σ (weights)
   */
  score(candidate: ProviderCandidateEvaluation): number {
    if (candidate.rejected) {
      return 0.0;
    }

    const w = this.weights;
    const totalWeight =
      w.capabilityMatch +
      w.benchmarkEvidence +
      w.evaluationScore +
      w.reliability +
      w.latency +
      w.cost +
      w.privacy +
      w.availability +
      w.freshness +
      w.historicalSuccess;

    if (totalWeight === 0) return 0.5;

    const rawScore =
      candidate.capabilityMatch * w.capabilityMatch +
      candidate.benchmarkEvidence * w.benchmarkEvidence +
      candidate.evaluationScore * w.evaluationScore +
      candidate.reliability * w.reliability +
      candidate.latency * w.latency +
      candidate.cost * w.cost +
      candidate.privacy * w.privacy +
      candidate.availability * w.availability +
      candidate.freshness * w.freshness +
      candidate.historicalSuccess * w.historicalSuccess;

    const normalized = rawScore / totalWeight;
    return Number(Math.max(0.0, Math.min(1.0, normalized)).toFixed(4));
  }

  /**
   * Get active scoring weights.
   */
  getWeights(): RoutingWeights {
    return { ...this.weights };
  }

  /**
   * Update scoring weights dynamically.
   */
  setWeights(updates: Partial<RoutingWeights>): void {
    this.weights = { ...this.weights, ...updates };
  }
}
