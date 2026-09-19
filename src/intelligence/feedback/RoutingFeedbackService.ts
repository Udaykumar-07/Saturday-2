/**
 * Routing Feedback Service for Saturday Intelligence System.
 *
 * Records execution outcomes, latencies, verification results, and user
 * corrections to feed back into future dynamic routing decisions.
 */

import { RoutingFeedback } from '../../core/types/intelligence';

const DEFAULT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class RoutingFeedbackService {
  private feedbackEntries: RoutingFeedback[] = [];

  /**
   * Record task outcome feedback.
   */
  recordFeedback(
    feedback: Omit<RoutingFeedback, 'id' | 'timestamp'>
  ): RoutingFeedback {
    const entry: RoutingFeedback = {
      ...feedback,
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };

    this.feedbackEntries.push(entry);

    // Keep at most 500 recent feedback entries in memory
    if (this.feedbackEntries.length > 500) {
      this.feedbackEntries.shift();
    }

    return entry;
  }

  /**
   * Get feedback history, optionally filtered by provider.
   */
  getHistory(providerId?: string, limit = 50): RoutingFeedback[] {
    let list = this.feedbackEntries;
    if (providerId) {
      list = list.filter((e) => e.providerId === providerId);
    }
    return list.slice(-limit);
  }

  /**
   * Get success rate for a provider within a given time window.
   */
  getSuccessRate(providerId: string, windowMs = DEFAULT_WINDOW_MS): number {
    const cutoff = Date.now() - windowMs;
    const providerEntries = this.feedbackEntries.filter(
      (e) => e.providerId === providerId && e.timestamp >= cutoff
    );

    if (providerEntries.length === 0) {
      return 0.9; // Prior belief for unobserved providers
    }

    const successes = providerEntries.filter((e) => e.success).length;
    return successes / providerEntries.length;
  }

  /**
   * Get recent failure entries for debugging or provider health checks.
   */
  getRecentFailures(providerId?: string, count = 10): RoutingFeedback[] {
    return this.feedbackEntries
      .filter((e) => !e.success && (!providerId || e.providerId === providerId))
      .slice(-count);
  }

  /**
   * Calculate historical success score (0-1) for scoring candidates.
   * Uses conservative Bayesian smoothing so single anomalies don't cause wild swings.
   */
  calculateHistoricalSuccessScore(providerId: string): number {
    const recent = this.getHistory(providerId, 20);
    if (recent.length === 0) return 0.85; // Default prior

    const successes = recent.filter((e) => e.success).length;
    // Bayesian Laplace-like smoothing: (successes + 2) / (total + 3)
    return (successes + 2) / (recent.length + 3);
  }

  /**
   * Clear all recorded feedback.
   */
  clear(): void {
    this.feedbackEntries = [];
  }
}
