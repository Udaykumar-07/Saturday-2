/**
 * Tests for PrivacyRouter.
 */

import { PrivacyRouter } from '../intelligence/privacy/PrivacyRouter';
import { IntelligenceProviderEntry } from '../core/types/intelligence';

describe('PrivacyRouter', () => {
  let router: PrivacyRouter;

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
    costProfile: { costTier: 'free' },
    latencyProfile: {},
    reliabilityProfile: { successRate: 1, failureRate: 0, sampleSize: 1 },
    state: 'ACTIVE',
    lastUpdated: Date.now(),
    source: 'test',
    version: '1.0.0',
  };

  const cloudProvider: IntelligenceProviderEntry = {
    id: 'cloud',
    name: 'Cloud Model',
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
      dataRetentionPolicy: 'persistent',
      sendsDataExternally: true,
      storageLocation: 'cloud',
    },
    costProfile: { costTier: 'medium' },
    latencyProfile: {},
    reliabilityProfile: { successRate: 1, failureRate: 0, sampleSize: 1 },
    state: 'ACTIVE',
    lastUpdated: Date.now(),
    source: 'test',
    version: '1.0.0',
  };

  beforeEach(() => {
    router = new PrivacyRouter();
  });

  test('allows local providers and blocks cloud providers when localOnly is true', () => {
    const localCheck = router.isCompatible(localProvider, {
      capabilities: [],
      reasoningLevel: 'basic',
      toolUseRequired: false,
      externalAccessRequired: false,
      localOnly: true,
      privacyLevel: 'local',
      multiStep: false,
    });

    const cloudCheck = router.isCompatible(cloudProvider, {
      capabilities: [],
      reasoningLevel: 'basic',
      toolUseRequired: false,
      externalAccessRequired: false,
      localOnly: true,
      privacyLevel: 'local',
      multiStep: false,
    });

    expect(localCheck.compatible).toBe(true);
    expect(cloudCheck.compatible).toBe(false);
  });

  test('blocks cloud providers with persistent data retention when privacyLevel is private', () => {
    const cloudCheck = router.isCompatible(cloudProvider, {
      capabilities: [],
      reasoningLevel: 'basic',
      toolUseRequired: false,
      externalAccessRequired: true,
      localOnly: false,
      privacyLevel: 'private',
      multiStep: false,
    });

    expect(cloudCheck.compatible).toBe(false);
  });

  test('gives highest score to local on-device processing', () => {
    const localScore = router.calculatePrivacyScore(localProvider, {} as any);
    const cloudScore = router.calculatePrivacyScore(cloudProvider, {
      privacyLevel: 'standard',
    } as any);

    expect(localScore).toBe(1.0);
    expect(cloudScore).toBeLessThan(1.0);
  });
});
