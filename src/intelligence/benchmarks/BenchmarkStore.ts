/**
 * Benchmark Store for Saturday Intelligence System.
 *
 * Stores and queries contextual, normalized benchmark evidence across providers.
 * Enforces that benchmarks are task-specific and not treated as a single global "best" score.
 */

import {
  BenchmarkRecord,
  DataFreshness,
  IntelligenceCapabilityId,
} from '../../core/types/intelligence';
import { normalizeCapability } from '../registry/CapabilityTaxonomy';

const DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export class BenchmarkStore {
  private records: Map<string, BenchmarkRecord> = new Map();

  /**
   * Add or update a benchmark record.
   * Calculates normalized score (0-1) if not already set.
   */
  addBenchmark(record: BenchmarkRecord): void {
    let normalizedScore = record.normalizedScore;
    if (normalizedScore === undefined) {
      if (record.score >= 0 && record.score <= 1) {
        normalizedScore = record.score;
      } else if (record.score <= 100) {
        normalizedScore = record.score / 100;
      } else {
        normalizedScore = Math.min(1.0, Math.max(0.0, record.score));
      }
    }

    const entry: BenchmarkRecord = {
      ...record,
      normalizedScore,
      capability: normalizeCapability(record.capability) as IntelligenceCapabilityId,
    };

    this.records.set(entry.id, entry);
  }

  /**
   * Get all benchmark records for a specific provider.
   */
  getBenchmarks(providerId: string): BenchmarkRecord[] {
    return Array.from(this.records.values()).filter((r) => r.providerId === providerId);
  }

  /**
   * Get benchmark records measuring a specific capability.
   */
  getBenchmarksByCapability(capability: string): BenchmarkRecord[] {
    const normalized = normalizeCapability(capability);
    return Array.from(this.records.values()).filter(
      (r) => normalizeCapability(r.capability) === normalized
    );
  }

  /**
   * Get top providers ranked for a specific capability based on benchmark evidence.
   */
  getBestForCapability(
    capability: string
  ): Array<{ providerId: string; score: number; confidence: number; benchmarkName: string }> {
    const records = this.getBenchmarksByCapability(capability);
    const byProvider: Map<
      string,
      { bestScore: number; confidence: number; benchmarkName: string }
    > = new Map();

    for (const r of records) {
      const score = r.normalizedScore ?? 0;
      const current = byProvider.get(r.providerId);
      if (!current || score > current.bestScore) {
        byProvider.set(r.providerId, {
          bestScore: score,
          confidence: r.confidence,
          benchmarkName: r.benchmarkName,
        });
      }
    }

    return Array.from(byProvider.entries())
      .map(([providerId, data]) => ({
        providerId,
        score: data.bestScore,
        confidence: data.confidence,
        benchmarkName: data.benchmarkName,
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Check data freshness for a provider's benchmarks.
   */
  getFreshness(providerId: string, maxAgeMs = DEFAULT_MAX_AGE_MS): DataFreshness {
    const records = this.getBenchmarks(providerId);
    if (records.length === 0) {
      return 'UNKNOWN';
    }

    const latest = Math.max(...records.map((r) => r.timestamp));
    const age = Date.now() - latest;

    if (age < maxAgeMs) {
      return 'FRESH';
    } else if (age < maxAgeMs * 2) {
      return 'STALE';
    } else {
      return 'EXPIRED';
    }
  }

  /**
   * Clear expired or older benchmark records.
   */
  clearStale(maxAgeMs = DEFAULT_MAX_AGE_MS): number {
    const cutoff = Date.now() - maxAgeMs;
    let count = 0;
    for (const [id, record] of this.records.entries()) {
      if (record.timestamp < cutoff) {
        this.records.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * Return all stored benchmark records.
   */
  getAll(): BenchmarkRecord[] {
    return Array.from(this.records.values());
  }

  /**
   * Clear all records.
   */
  clear(): void {
    this.records.clear();
  }
}
