/**
 * Hard Constraint Filter for Saturday Routing Engine.
 *
 * Enforces non-negotiable boundaries before soft optimization:
 * - localOnly restrictions
 * - Privacy boundaries
 * - Required capability presence
 * - Authentication requirements
 * - Maximum cost limits
 * - Minimum reliability thresholds
 */

import {
  IntelligenceProviderEntry,
  RejectedCandidate,
} from '../../core/types/intelligence';
import { TaskRequirements } from '../../core/types/external';
import { AuthenticationManager } from '../../core/external/authentication/AuthenticationManager';
import { calculateCapabilityCoverage } from '../registry/CapabilityTaxonomy';
import { PrivacyRouter } from '../privacy/PrivacyRouter';
import { CostEstimator } from '../cost/CostEstimator';

export interface FilterResult {
  passed: IntelligenceProviderEntry[];
  rejected: RejectedCandidate[];
}

export class HardConstraintFilter {
  constructor(
    private privacyRouter: PrivacyRouter,
    private costEstimator: CostEstimator,
    private authManager?: AuthenticationManager
  ) {}

  /**
   * Filter candidate providers through all hard constraints.
   */
  filter(
    candidates: IntelligenceProviderEntry[],
    requirements: TaskRequirements
  ): FilterResult {
    const passed: IntelligenceProviderEntry[] = [];
    const rejected: RejectedCandidate[] = [];

    for (const candidate of candidates) {
      // 1. Lifecycle state constraint (DEPRECATED, DISABLED, UNAVAILABLE are rejected)
      if (candidate.state === 'DISABLED' || candidate.state === 'DEPRECATED' || candidate.state === 'UNAVAILABLE') {
        rejected.push({
          providerId: candidate.id,
          reason: `Provider state is ${candidate.state}`,
        });
        continue;
      }

      // 2. Privacy & Local-only constraints
      const privacyCheck = this.privacyRouter.isCompatible(candidate, requirements);
      if (!privacyCheck.compatible) {
        rejected.push({
          providerId: candidate.id,
          reason: privacyCheck.reason || 'Failed privacy compatibility check',
        });
        continue;
      }

      // 3. Required capabilities check
      // If task is multiStep, multiple providers cooperate so candidate needs coverage > 0.
      // If single-step, the selected provider must cover all required capabilities (coverage === 1.0).
      const required = requirements.requiredCapabilities || requirements.capabilities || [];
      if (required.length > 0) {
        const provCaps = candidate.capabilities.map((c) => c.id);
        const coverage = calculateCapabilityCoverage(required, provCaps);
        const minRequiredCoverage = requirements.multiStep && required.length > 1 ? 0.0001 : 1.0;

        if (coverage < minRequiredCoverage) {
          rejected.push({
            providerId: candidate.id,
            reason: `Missing required capabilities (coverage: ${(coverage * 100).toFixed(0)}%)`,
          });
          continue;
        }
      }

      // 4. Cost constraints
      const costCheck = this.costEstimator.isCostAllowed(
        candidate,
        requirements,
        requirements.costMode || 'BALANCED'
      );
      if (!costCheck.allowed) {
        rejected.push({
          providerId: candidate.id,
          reason: costCheck.reason || 'Violated cost constraints',
        });
        continue;
      }

      // 5. Reliability threshold
      if (requirements.minimumReliability !== undefined) {
        const rel = candidate.reliabilityProfile.recentSuccessRate ?? candidate.reliabilityProfile.successRate;
        if (rel < requirements.minimumReliability) {
          rejected.push({
            providerId: candidate.id,
            reason: `Reliability ${(rel * 100).toFixed(1)}% is below required ${(requirements.minimumReliability * 100).toFixed(1)}%`,
          });
          continue;
        }
      }

      // 6. Authentication requirements
      if (requirements.requiresAuthentication && this.authManager) {
        if (candidate.type === 'API' && candidate.id.includes('gmail')) {
          const isAuthed = this.authManager.isAuthenticated('gmail');
          if (!isAuthed) {
            rejected.push({
              providerId: candidate.id,
              reason: 'Required Gmail authentication is not currently active',
            });
            continue;
          }
        }
      }

      passed.push(candidate);
    }

    return { passed, rejected };
  }
}
