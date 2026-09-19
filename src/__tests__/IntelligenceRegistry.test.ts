/**
 * Tests for Intelligence Registry.
 */

import { IntelligenceRegistry } from '../intelligence/registry/IntelligenceRegistry';
import { IntelligenceProviderEntry } from '../core/types/intelligence';

describe('IntelligenceRegistry', () => {
  let registry: IntelligenceRegistry;

  beforeEach(() => {
    registry = new IntelligenceRegistry();
  });

  test('initializes with default built-in providers', () => {
    const providers = registry.getAllProviders();
    expect(providers.length).toBeGreaterThanOrEqual(4);

    expect(registry.getProvider('local')).toBeDefined();
    expect(registry.getProvider('android_actions')).toBeDefined();
    expect(registry.getProvider('gmail_api')).toBeDefined();
    expect(registry.getProvider('research_agent')).toBeDefined();
    expect(registry.getProvider('cloud_frontier_model')).toBeDefined();
  });

  test('registers, updates, and removes a custom provider', () => {
    const custom: IntelligenceProviderEntry = {
      id: 'custom_vision_model',
      name: 'Custom Vision Model',
      type: 'CLOUD_MODEL',
      capabilities: [
        { id: 'VISION', category: 'media', score: 0.9 },
        { id: 'IMAGE_ANALYSIS', category: 'media', score: 0.95 },
      ],
      inputTypes: ['image'],
      outputTypes: ['text'],
      reasoningLevel: 'basic',
      contextWindow: 32000,
      visionSupport: true,
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
        costTier: 'low',
      },
      latencyProfile: {
        averageMs: 800,
      },
      reliabilityProfile: {
        successRate: 0.95,
        failureRate: 0.05,
        sampleSize: 10,
      },
      state: 'ACTIVE',
      lastUpdated: Date.now(),
      source: 'custom',
      version: '1.0.0',
    };

    registry.registerProvider(custom);
    expect(registry.getProvider('custom_vision_model')).toBeDefined();

    registry.updateProvider('custom_vision_model', { name: 'Updated Vision Model' });
    expect(registry.getProvider('custom_vision_model')?.name).toBe('Updated Vision Model');

    registry.removeProvider('custom_vision_model');
    expect(registry.getProvider('custom_vision_model')).toBeNull();
  });

  test('finds candidates matching required capabilities', () => {
    const candidates = registry.findCandidates({
      capabilities: ['EMAIL_ACCESS'],
      reasoningLevel: 'none',
      toolUseRequired: true,
      externalAccessRequired: true,
      localOnly: false,
      privacyLevel: 'private',
      multiStep: false,
    });

    expect(candidates.some((c) => c.id === 'gmail_api')).toBe(true);
  });

  test('finds providers by capability and by type', () => {
    const mediaProviders = registry.getProvidersByCapability('MEDIA_PLAYBACK');
    expect(mediaProviders.some((p) => p.id === 'android_actions')).toBe(true);

    const agentProviders = registry.getProvidersByType('AGENT');
    expect(agentProviders.some((p) => p.id === 'research_agent')).toBe(true);
  });

  test('manages provider lifecycle states', () => {
    expect(registry.getProviderState('local')).toBe('ACTIVE');

    registry.setProviderState('local', 'DEGRADED');
    expect(registry.getProviderState('local')).toBe('DEGRADED');
    // DEGRADED providers are still in getActiveProviders (usable with warning)
    expect(registry.getActiveProviders().some((p) => p.id === 'local')).toBe(true);

    registry.setProviderState('local', 'DISABLED');
    expect(registry.getProviderState('local')).toBe('DISABLED');
    // DISABLED providers are excluded from getActiveProviders
    expect(registry.getActiveProviders().some((p) => p.id === 'local')).toBe(false);
  });
});
