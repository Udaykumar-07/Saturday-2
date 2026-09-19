/**
 * External Intelligence Provider Interface & Base Classes.
 *
 * All external AI providers (cloud models, agents, APIs, tools) implement this contract.
 * Saturday core remains decoupled from any specific provider (OpenAI, Anthropic, Google, etc.).
 */

import {
  ExternalIntelligenceProvider,
  ExternalProviderType,
  ExternalRequest,
  ExternalResponse,
  ProviderHealth,
} from '../../types/external';

export type {
  ExternalIntelligenceProvider,
  ExternalProviderType,
  ExternalRequest,
  ExternalResponse,
  ProviderHealth,
};

/**
 * Base abstract class for external providers providing default health tracking.
 */
export abstract class BaseExternalProvider implements ExternalIntelligenceProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly type: ExternalProviderType;

  protected successCount = 0;
  protected failureCount = 0;
  protected lastSuccessTimestamp?: number;
  protected lastFailureTimestamp?: number;
  protected totalLatencyMs = 0;

  abstract isAvailable(): Promise<boolean>;
  abstract getCapabilities(): Promise<string[]> | string[];
  abstract execute(request: ExternalRequest): Promise<ExternalResponse>;

  /**
   * Health metrics for this provider.
   */
  getHealth(): ProviderHealth {
    const totalCalls = this.successCount + this.failureCount;
    return {
      available: true,
      lastSuccess: this.lastSuccessTimestamp,
      lastFailure: this.lastFailureTimestamp,
      latencyMs: totalCalls > 0 ? Math.round(this.totalLatencyMs / totalCalls) : undefined,
      errorRate: totalCalls > 0 ? this.failureCount / totalCalls : 0,
    };
  }

  protected recordSuccess(latencyMs: number): void {
    this.successCount++;
    this.totalLatencyMs += latencyMs;
    this.lastSuccessTimestamp = Date.now();
  }

  protected recordFailure(): void {
    this.failureCount++;
    this.lastFailureTimestamp = Date.now();
  }
}
