/**
 * Tests for LatencyTracker.
 */

import { LatencyTracker } from '../intelligence/performance/LatencyTracker';

describe('LatencyTracker', () => {
  let tracker: LatencyTracker;

  beforeEach(() => {
    tracker = new LatencyTracker();
  });

  test('records latency and computes average and percentiles', () => {
    tracker.recordLatency('p1', 100);
    tracker.recordLatency('p1', 200);
    tracker.recordLatency('p1', 300);
    tracker.recordLatency('p1', 400);
    tracker.recordLatency('p1', 500);

    expect(tracker.getAverageLatency('p1')).toBe(300);
    expect(tracker.getP50Latency('p1')).toBe(300);
    expect(tracker.getP95Latency('p1')).toBe(500);
  });

  test('computes normalized latency score', () => {
    tracker.recordLatency('fast_provider', 80);
    tracker.recordLatency('slow_provider', 4000);

    const fastScore = tracker.calculateLatencyScore('fast_provider');
    const slowScore = tracker.calculateLatencyScore('slow_provider');

    expect(fastScore).toBeGreaterThan(slowScore);
    expect(fastScore).toBe(1.0);
    expect(slowScore).toBeLessThan(0.5);
  });

  test('returns null for unobserved providers', () => {
    expect(tracker.getAverageLatency('unobserved')).toBeNull();
    expect(tracker.getP50Latency('unobserved')).toBeNull();
  });
});
