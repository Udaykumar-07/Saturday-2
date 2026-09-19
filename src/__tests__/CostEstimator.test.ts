/**
 * Tests for CostEstimator.
 */

import { CostEstimator } from '../intelligence/cost/CostEstimator';
import { IntelligenceProviderEntry } from '../core/types/intelligence';

describe('CostEstimator', () => {
  let estimator: CostEstimator;

  beforeEach(() => {
    estimator = new CostEstimator();
  });

  test('estimates local models and tools as zero cost', () => {
    const localProvider: IntelligenceProviderEntry = {
      id: 'local',
      name: 'Local Model',
      type: 'LOCAL_MODEL',
      capabilities: [],
      inputTypes: [],
      outputTypes: [],
      reasoningLevel: 'basic',
      contextWindow: 4096,
      visionSupport: false,
      codingSupport: false,
      researchSupport: false,
      agenticSupport: false,
      supportsStreaming: true,
      supportsStructuredOutput: true,
      supportsFunctionCalling: false,
      privacyProfile: {
        level: 'local',
        dataRetentionPolicy: 'none',
        sendsDataExternally: false,
        storageLocation: 'device',
      },
      costProfile: {
        costTier: 'free',
      },
      latencyProfile: {},
      reliabilityProfile: { successRate: 1, failureRate: 0, sampleSize: 1 },
      state: 'ACTIVE',
      lastUpdated: Date.now(),
      source: 'test',
      version: '1.0.0',
    };

    const estimate = estimator.estimate(localProvider, {
      capabilities: ['TEXT_GENERATION'],
      reasoningLevel: 'basic',
      toolUseRequired: false,
      externalAccessRequired: false,
      localOnly: true,
      privacyLevel: 'local',
      multiStep: false,
    });

    expect(estimate.estimatedTaskCost).toBe(0);
    expect(estimate.unknown).toBe(false);
    expect(estimator.calculateCostEfficiency(localProvider, {} as any)).toBe(1.0);
  });

  test('estimates cost for cloud models with token pricing', () => {
    const cloudProvider: IntelligenceProviderEntry = {
      id: 'cloud_test',
      name: 'Cloud Test Model',
      type: 'CLOUD_MODEL',
      capabilities: [],
      inputTypes: [],
      outputTypes: [],
      reasoningLevel: 'advanced',
      contextWindow: 128000,
      visionSupport: false,
      codingSupport: false,
      researchSupport: false,
      agenticSupport: false,
      supportsStreaming: true,
      supportsStructuredOutput: true,
      supportsFunctionCalling: false,
      privacyProfile: {
        level: 'standard',
        dataRetentionPolicy: 'none',
        sendsDataExternally: true,
        storageLocation: 'cloud',
      },
      costProfile: {
        costTier: 'medium',
        inputCostPer1kTokens: 0.002,
        outputCostPer1kTokens: 0.008,
      },
      latencyProfile: {},
      reliabilityProfile: { successRate: 1, failureRate: 0, sampleSize: 1 },
      state: 'ACTIVE',
      lastUpdated: Date.now(),
      source: 'test',
      version: '1.0.0',
    };

    const estimate = estimator.estimate(
      cloudProvider,
      {} as any,
      1000, // 1k input tokens -> $0.002
      1000  // 1k output tokens -> $0.008
    );

    expect(estimate.estimatedTaskCost).toBeCloseTo(0.01, 3);
    expect(estimate.unknown).toBe(false);
  });

  test('marks unknown when pricing metadata is absent without inventing numbers', () => {
    const unpricedProvider: IntelligenceProviderEntry = {
      id: 'unpriced',
      name: 'Unpriced Model',
      type: 'CLOUD_MODEL',
      capabilities: [],
      inputTypes: [],
      outputTypes: [],
      reasoningLevel: 'basic',
      contextWindow: 8000,
      visionSupport: false,
      codingSupport: false,
      researchSupport: false,
      agenticSupport: false,
      supportsStreaming: false,
      supportsStructuredOutput: false,
      supportsFunctionCalling: false,
      privacyProfile: {
        level: 'standard',
        dataRetentionPolicy: 'none',
        sendsDataExternally: true,
        storageLocation: 'cloud',
      },
      costProfile: {
        costTier: 'unknown',
      },
      latencyProfile: {},
      reliabilityProfile: { successRate: 1, failureRate: 0, sampleSize: 1 },
      state: 'ACTIVE',
      lastUpdated: Date.now(),
      source: 'test',
      version: '1.0.0',
    };

    const estimate = estimator.estimate(unpricedProvider, {} as any);
    expect(estimate.unknown).toBe(true);
    expect(estimate.estimatedTaskCost).toBeUndefined();
  });
});
