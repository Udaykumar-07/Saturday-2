/**
 * Latency Tracker for Saturday Intelligence System.
 *
 * Tracks empirical request latency, averages, and percentiles across
 * time windows to avoid relying on provider marketing claims.
 */

interface LatencyEntry {
  latencyMs: number;
  timestamp: number;
}

const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export class LatencyTracker {
  private measurements: Map<string, LatencyEntry[]> = new Map();

  /**
   * Record a latency measurement for a provider.
   */
  recordLatency(providerId: string, latencyMs: number, timestamp = Date.now()): void {
    let entries = this.measurements.get(providerId);
    if (!entries) {
      entries = [];
      this.measurements.set(providerId, entries);
    }

    entries.push({ latencyMs, timestamp });

    // Keep at most 200 measurements per provider
    if (entries.length > 200) {
      entries.shift();
    }
  }

  /**
   * Get average latency over a time window.
   */
  getAverageLatency(providerId: string, windowMs = DEFAULT_WINDOW_MS): number | null {
    const valid = this.getValidEntries(providerId, windowMs);
    if (valid.length === 0) return null;

    const sum = valid.reduce((acc, e) => acc + e.latencyMs, 0);
    return Math.round(sum / valid.length);
  }

  /**
   * Get 50th percentile (median) latency.
   */
  getP50Latency(providerId: string, windowMs = DEFAULT_WINDOW_MS): number | null {
    return this.getPercentile(providerId, 0.5, windowMs);
  }

  /**
   * Get 95th percentile latency.
   */
  getP95Latency(providerId: string, windowMs = DEFAULT_WINDOW_MS): number | null {
    return this.getPercentile(providerId, 0.95, windowMs);
  }

  /**
   * Get recent latency measurements.
   */
  getRecent(providerId: string, count = 10): number[] {
    const entries = this.measurements.get(providerId) || [];
    return entries.slice(-count).map((e) => e.latencyMs);
  }

  /**
   * Calculate a normalized latency score (0-1).
   * < 100ms -> 1.0, 1000ms -> 0.7, 5000ms -> 0.3, > 10000ms -> 0.1
   */
  calculateLatencyScore(providerId: string, fallbackAverageMs = 1500): number {
    const avg = this.getAverageLatency(providerId) ?? fallbackAverageMs;

    if (avg <= 100) return 1.0;
    if (avg <= 500) return 0.9;
    if (avg <= 1500) return 0.75;
    if (avg <= 3000) return 0.55;
    if (avg <= 7000) return 0.35;
    return 0.15;
  }

  /**
   * Clear all records.
   */
  clear(): void {
    this.measurements.clear();
  }

  private getValidEntries(providerId: string, windowMs: number): LatencyEntry[] {
    const entries = this.measurements.get(providerId) || [];
    const cutoff = Date.now() - windowMs;
    return entries.filter((e) => e.timestamp >= cutoff);
  }

  private getPercentile(
    providerId: string,
    percentile: number,
    windowMs: number
  ): number | null {
    const valid = this.getValidEntries(providerId, windowMs);
    if (valid.length === 0) return null;

    const sorted = [...valid].map((e) => e.latencyMs).sort((a, b) => a - b);
    const index = Math.min(
      Math.floor(sorted.length * percentile),
      sorted.length - 1
    );
    return sorted[index];
  }
}
