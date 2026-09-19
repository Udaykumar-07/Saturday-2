/**
 * Provider Health Tracker for Saturday.
 *
 * Tracks operational health across external providers and agents:
 * - Availability state
 * - Timestamps of last success and failure
 * - Rolling average latency
 * - Error rates
 *
 * Note: Does NOT rank or benchmark models (Phase 4 scope).
 */

import { ProviderHealth } from '../../types/external';

interface InternalHealthMetrics {
  available: boolean;
  successCount: number;
  failureCount: number;
  totalLatencyMs: number;
  lastSuccess?: number;
  lastFailure?: number;
}

export class ProviderHealthTracker {
  private metrics: Map<string, InternalHealthMetrics> = new Map();

  private getOrCreate(providerId: string): InternalHealthMetrics {
    let m = this.metrics.get(providerId);
    if (!m) {
      m = {
        available: true,
        successCount: 0,
        failureCount: 0,
        totalLatencyMs: 0,
      };
      this.metrics.set(providerId, m);
    }
    return m;
  }

  /**
   * Record a successful provider execution.
   */
  recordSuccess(providerId: string, latencyMs?: number): void {
    const m = this.getOrCreate(providerId);
    m.available = true;
    m.successCount++;
    m.lastSuccess = Date.now();
    if (latencyMs !== undefined) {
      m.totalLatencyMs += latencyMs;
    }
  }

  /**
   * Record a failed provider execution.
   */
  recordFailure(providerId: string, latencyMs?: number): void {
    const m = this.getOrCreate(providerId);
    m.failureCount++;
    m.lastFailure = Date.now();
    if (latencyMs !== undefined) {
      m.totalLatencyMs += latencyMs;
    }
    // If consecutive failures exceed 3, mark as temporarily unavailable
    if (m.failureCount >= 3 && m.successCount === 0) {
      m.available = false;
    }
  }

  /**
   * Explicitly set provider availability.
   */
  setAvailability(providerId: string, available: boolean): void {
    const m = this.getOrCreate(providerId);
    m.available = available;
  }

  /**
   * Retrieve calculated health metrics for a provider.
   */
  getHealth(providerId: string): ProviderHealth {
    const m = this.getOrCreate(providerId);
    const totalCalls = m.successCount + m.failureCount;

    return {
      available: m.available,
      lastSuccess: m.lastSuccess,
      lastFailure: m.lastFailure,
      latencyMs: totalCalls > 0 ? Math.round(m.totalLatencyMs / totalCalls) : undefined,
      errorRate: totalCalls > 0 ? m.failureCount / totalCalls : 0,
    };
  }

  /**
   * Retrieve health across all tracked providers.
   */
  getAllHealth(): Map<string, ProviderHealth> {
    const all = new Map<string, ProviderHealth>();
    for (const id of this.metrics.keys()) {
      all.set(id, this.getHealth(id));
    }
    return all;
  }

  /**
   * Reset metrics for testing or reinitialization.
   */
  reset(): void {
    this.metrics.clear();
  }
}
