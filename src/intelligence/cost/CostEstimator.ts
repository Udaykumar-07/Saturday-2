/**
 * Cost Estimator for Saturday Intelligence System.
 *
 * Calculates projected cost for candidate providers based on metadata.
 * Does not invent prices; marks unknown when metadata is missing.
 */

import {
  CostEstimate,
  CostMode,
  IntelligenceProviderEntry,
} from '../../core/types/intelligence';
import { TaskRequirements } from '../../core/types/external';

export class CostEstimator {
  /**
   * Estimate task cost based on provider cost profile and task parameters.
   */
  estimate(
    provider: IntelligenceProviderEntry,
    requirements: TaskRequirements,
    estimatedInputTokens = 500,
    estimatedOutputTokens = 300
  ): CostEstimate {
    const profile = provider.costProfile;

    if (profile.costTier === 'free' || provider.type === 'LOCAL_MODEL' || provider.type === 'TOOL') {
      return {
        estimatedInputCost: 0,
        estimatedOutputCost: 0,
        estimatedTaskCost: 0,
        currency: profile.currency || 'USD',
        unknown: false,
      };
    }

    if (
      profile.inputCostPer1kTokens === undefined ||
      profile.outputCostPer1kTokens === undefined
    ) {
      return {
        unknown: true,
        currency: profile.currency || 'USD',
      };
    }

    const inputCost = (estimatedInputTokens / 1000) * profile.inputCostPer1kTokens;
    const outputCost = (estimatedOutputTokens / 1000) * profile.outputCostPer1kTokens;
    const taskCost = inputCost + outputCost;

    return {
      estimatedInputCost: Number(inputCost.toFixed(6)),
      estimatedOutputCost: Number(outputCost.toFixed(6)),
      estimatedTaskCost: Number(taskCost.toFixed(6)),
      currency: profile.currency || 'USD',
      unknown: false,
    };
  }

  /**
   * Determine whether a provider violates a task's cost constraints or user cost mode.
   */
  isCostAllowed(
    provider: IntelligenceProviderEntry,
    requirements: TaskRequirements,
    costMode: CostMode = 'BALANCED'
  ): { allowed: boolean; reason?: string } {
    const estimate = this.estimate(provider, requirements);

    // Hard limit: maxCost
    if (requirements.maxCost !== undefined && !estimate.unknown) {
      if ((estimate.estimatedTaskCost ?? 0) > requirements.maxCost) {
        return {
          allowed: false,
          reason: `Estimated cost ($${estimate.estimatedTaskCost}) exceeds maxCost limit ($${requirements.maxCost})`,
        };
      }
    }

    // Cost mode preference filtering
    if (costMode === 'FREE_PREFERRED') {
      if (provider.costProfile.costTier !== 'free' && provider.type !== 'LOCAL_MODEL' && provider.type !== 'TOOL') {
        // Not rejected, but flag for soft scoring
      }
    }

    return { allowed: true };
  }

  /**
   * Score cost efficiency between 0 and 1 (1 = free / lowest cost, 0 = highest).
   */
  calculateCostEfficiency(
    provider: IntelligenceProviderEntry,
    requirements: TaskRequirements,
    costMode: CostMode = 'BALANCED'
  ): number {
    const estimate = this.estimate(provider, requirements);

    if (estimate.estimatedTaskCost === 0 || provider.costProfile.costTier === 'free') {
      return 1.0;
    }

    if (estimate.unknown) {
      switch (provider.costProfile.costTier) {
        case 'low': return 0.75;
        case 'medium': return 0.5;
        case 'high': return 0.25;
        default: return 0.5;
      }
    }

    const cost = estimate.estimatedTaskCost ?? 0;
    // Non-linear decay: cost < $0.005 is high score, > $0.05 is low score
    const score = Math.max(0.0, 1.0 - Math.min(1.0, cost / 0.05));

    if (costMode === 'FREE_PREFERRED') {
      return score * 0.5; // Penalize paid models heavily in free mode
    }

    return score;
  }
}
