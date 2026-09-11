/**
 * AI Router — decides which provider handles a request.
 * Phase 1: simple priority-based routing.
 * Future: task-aware, benchmark-informed, cost-optimized routing.
 */

import { AIRoutingDecision } from '../types/ai';
import { AIProviderRegistry } from '../ai/AIProviderRegistry';
import { AIProviderUnavailableError, RoutingError } from '../types/errors';

export class AIRouter {
  constructor(private registry: AIProviderRegistry) {}

  /**
   * Decide which provider to use.
   *
   * Phase 1 strategy:
   * 1. If local provider is available, use it
   * 2. Otherwise, use first available provider
   * 3. If nothing available, return explicit error
   */
  async route(_taskType?: string): Promise<AIRoutingDecision> {
    // Priority 1: local provider
    const localProvider = this.registry.getProvider('local');
    if (localProvider) {
      const available = await localProvider.isAvailable();
      if (available) {
        return {
          providerId: 'local',
          reason: 'Local AI model is available — using on-device inference.',
          confidence: 1.0,
        };
      }
    }

    // Priority 2: any available provider
    const availableProviders = await this.registry.getAvailableProviders();
    if (availableProviders.length > 0) {
      const selected = availableProviders[0];
      return {
        providerId: selected.id,
        reason: `Using ${selected.name} — local model not available.`,
        confidence: 0.7,
      };
    }

    // No providers available
    throw new AIProviderUnavailableError(
      'No AI provider is currently available. Please configure a local model or another provider.'
    );
  }
}
