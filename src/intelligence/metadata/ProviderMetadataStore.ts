/**
 * Provider Metadata Store for Dynamic Routing Intelligence.
 *
 * Provides rich metadata about providers including capabilities,
 * benchmarks, cost estimates, and latency profiles.
 */

import { BenchmarkScore, KNOWN_BENCHMARKS } from './BenchmarkData';

export class ProviderMetadataStore {
  private cache: Map<string, any> = new Map();

  constructor(private benchmarkData: typeof KNOWN_BENCHMARKS) {}

  /**
   * Get the capabilities of a provider.
   * Returns an array of capability IDs.
   */
  getCapabilities(providerId: string): string[] {
    const cached = this.cache.get(`capabilities_${providerId}`);
    if (cached) return cached;

    // Hardcoded capabilities for now
    const capabilities: Record<string, string[]> = {
      openai_provider: [
        'TEXT_GENERATION',
        'REASONING',
        'DEEP_REASONING',
        'CODING',
        'VISION',
        'FUNCTION_CALLING',
        'STRUCTURED_OUTPUT',
      ],
      anthropic_provider: [
        'TEXT_GENERATION',
        'REASONING',
        'DEEP_REASONING',
        'CODING',
        'VISION',
        'LONG_CONTEXT',
        'STRUCTURED_OUTPUT',
      ],
      google_gemini_provider: [
        'TEXT_GENERATION',
        'REASONING',
        'CODING',
        'VISION',
        'FUNCTION_CALLING',
        'MULTI_STEP_EXECUTION',
      ],
      local: [
        'TEXT_GENERATION',
        'REASONING',
        'PRIVATE_DATA_PROCESSING',
      ],
    };

    const result = capabilities[providerId] || [];
    this.cache.set(`capabilities_${providerId}`, result);
    return result;
  }

  /**
   * Get benchmark scores for a provider.
   */
  getBenchmarks(providerId: string): BenchmarkScore[] {
    return this.benchmarkData[providerId] || [];
  }

  /**
   * Estimate cost for a given provider and token count.
   * Returns cost in USD.
   */
  getCostEstimate(providerId: string, estimatedTokens: number): number {
    // Cost per 1K tokens (input + output average)
    const costPer1k: Record<string, number> = {
      openai_provider: 0.0075, // GPT-4o approximate average
      anthropic_provider: 0.01, // Claude approximate average
      google_gemini_provider: 0.00025, // Gemini Pro approximate
      local: 0, // Free on-device
    };

    const rate = costPer1k[providerId] || 0;
    return (estimatedTokens / 1000) * rate;
  }

  /**
   * Get typical latency for a provider in milliseconds.
   */
  getLatency(providerId: string): number {
    const latencies: Record<string, number> = {
      openai_provider: 1200,
      anthropic_provider: 1500,
      google_gemini_provider: 800,
      local: 3000, // Local on-device inference is slower but private
    };

    return latencies[providerId] || 2000;
  }

  /**
   * Refresh metadata from external sources.
   * Placeholder for future dynamic updates.
   */
  async refresh(): Promise<void> {
    // Future: fetch updated benchmarks, pricing, etc.
    this.cache.clear();
  }
}
