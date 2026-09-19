/**
 * Tests for BenchmarkStore.
 */

import { BenchmarkStore } from '../intelligence/benchmarks/BenchmarkStore';
import { BenchmarkRecord } from '../core/types/intelligence';

describe('BenchmarkStore', () => {
  let store: BenchmarkStore;

  beforeEach(() => {
    store = new BenchmarkStore();
  });

  test('adds and retrieves benchmarks with normalized scores', () => {
    const record: BenchmarkRecord = {
      id: 'bm-1',
      providerId: 'cloud_frontier_model',
      capability: 'CODING',
      benchmarkName: 'HumanEval',
      score: 85.5, // Percentage
      metric: 'pass@1',
      taskCategory: 'coding',
      source: 'benchmark-org',
      timestamp: Date.now(),
      confidence: 0.95,
    };

    store.addBenchmark(record);
    const retrieved = store.getBenchmarks('cloud_frontier_model');

    expect(retrieved.length).toBe(1);
    expect(retrieved[0].normalizedScore).toBeCloseTo(0.855, 3);
  });

  test('ranks best providers for capability', () => {
    store.addBenchmark({
      id: 'bm-a',
      providerId: 'model_a',
      capability: 'REASONING',
      benchmarkName: 'MMLU',
      score: 70,
      metric: 'acc',
      taskCategory: 'reasoning',
      source: 'eval-lab',
      timestamp: Date.now(),
      confidence: 0.9,
    });

    store.addBenchmark({
      id: 'bm-b',
      providerId: 'model_b',
      capability: 'REASONING',
      benchmarkName: 'MMLU',
      score: 92,
      metric: 'acc',
      taskCategory: 'reasoning',
      source: 'eval-lab',
      timestamp: Date.now(),
      confidence: 0.95,
    });

    const ranked = store.getBestForCapability('REASONING');
    expect(ranked[0].providerId).toBe('model_b');
    expect(ranked[1].providerId).toBe('model_a');
  });

  test('tracks benchmark data freshness', () => {
    const recentTime = Date.now() - 1000 * 60 * 60; // 1 hr ago
    store.addBenchmark({
      id: 'bm-recent',
      providerId: 'fresh_model',
      capability: 'TEXT_GENERATION',
      benchmarkName: 'TestBench',
      score: 0.9,
      metric: 'score',
      taskCategory: 'generation',
      source: 'test',
      timestamp: recentTime,
      confidence: 0.9,
    });

    expect(store.getFreshness('fresh_model')).toBe('FRESH');
    expect(store.getFreshness('non_existent')).toBe('UNKNOWN');
  });
});
