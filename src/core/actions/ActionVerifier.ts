/**
 * Action Verifier — post-execution verification.
 * Checks whether the action actually achieved its intended effect.
 * Phase 2: basic verification with capability-specific checks.
 */

import { ActionIntent, ActionResult, VerificationResult } from '../types/action';
import { CapabilityRegistry } from './CapabilityRegistry';

export class ActionVerifier {
  constructor(private _registry: CapabilityRegistry) {}

  /**
   * Verify an action result.
   * Phase 2 performs basic verification based on the ActionResult.
   * Future phases will add capability-specific verification (e.g. check clipboard contents).
   */
  async verify(
    intent: ActionIntent,
    result: ActionResult
  ): Promise<VerificationResult> {
    // Basic verification: if execution reported success, trust it for now.
    // Future: capability-specific verification (read clipboard back, check foreground app, etc.)
    if (result.success) {
      return {
        verified: true,
        details: `Action "${intent.description}" completed successfully.`,
      };
    }

    return {
      verified: false,
      details: result.error || `Action "${intent.description}" failed.`,
    };
  }
}
