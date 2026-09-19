/**
 * Tests for HardConstraintFilter.
 */

import { HardConstraintFilter } from '../intelligence/routing/HardConstraintFilter';
import { PrivacyRouter } from '../intelligence/privacy/PrivacyRouter';
import { CostEstimator } from '../intelligence/cost/CostEstimator';
import { IntelligenceRegistry } from '../intelligence/registry/IntelligenceRegistry';

describe('HardConstraintFilter', () => {
  let filter: HardConstraintFilter;
  let registry: IntelligenceRegistry;

  beforeEach(() => {
    registry = new IntelligenceRegistry();
    const privacy = new PrivacyRouter();
    const cost = new CostEstimator();
    filter = new HardConstraintFilter(privacy, cost);
  });

  test('enforces localOnly constraint by rejecting external/cloud providers', () => {
    const candidates = registry.getAllProviders();
    const result = filter.filter(candidates, {
      capabilities: ['TEXT_GENERATION'],
      reasoningLevel: 'basic',
      toolUseRequired: false,
      externalAccessRequired: false,
      localOnly: true,
      privacyLevel: 'local',
      multiStep: false,
    });

    // Cloud models and agents must be rejected
    expect(result.rejected.some((r) => r.providerId === 'cloud_frontier_model')).toBe(true);
    expect(result.rejected.some((r) => r.providerId === 'research_agent')).toBe(true);

    // Local model and android actions must pass
    expect(result.passed.some((p) => p.id === 'local')).toBe(true);
    expect(result.passed.every((p) => p.privacyProfile.level === 'local')).toBe(true);
  });

  test('rejects providers missing required capabilities', () => {
    const candidates = registry.getAllProviders();
    const result = filter.filter(candidates, {
      capabilities: ['EMAIL_ACCESS'],
      requiredCapabilities: ['EMAIL_ACCESS'],
      reasoningLevel: 'none',
      toolUseRequired: true,
      externalAccessRequired: true,
      localOnly: false,
      privacyLevel: 'private',
      multiStep: false,
    });

    // local model does not have EMAIL_ACCESS
    expect(result.rejected.some((r) => r.providerId === 'local')).toBe(true);
    // gmail_api has EMAIL_ACCESS
    expect(result.passed.some((p) => p.id === 'gmail_api')).toBe(true);
  });

  test('rejects disabled or deprecated providers', () => {
    registry.setProviderState('local', 'DISABLED');
    const candidates = registry.getAllProviders();

    const result = filter.filter(candidates, {
      capabilities: ['TEXT_GENERATION'],
      reasoningLevel: 'basic',
      toolUseRequired: false,
      externalAccessRequired: false,
      localOnly: false,
      privacyLevel: 'standard',
      multiStep: false,
    });

    expect(result.rejected.some((r) => r.providerId === 'local')).toBe(true);
    expect(result.passed.some((p) => p.id === 'local')).toBe(false);
  });

  test('enforces maxCost constraint', () => {
    const candidates = registry.getAllProviders();
    const result = filter.filter(candidates, {
      capabilities: ['REASONING'],
      reasoningLevel: 'deep',
      toolUseRequired: false,
      externalAccessRequired: true,
      localOnly: false,
      privacyLevel: 'standard',
      multiStep: false,
      maxCost: 0.0001, // Very low budget
    });

    // Paid cloud frontier model exceeds maxCost
    expect(result.rejected.some((r) => r.providerId === 'cloud_frontier_model')).toBe(true);
    // Free local model passes
    expect(result.passed.some((p) => p.id === 'local')).toBe(true);
  });

  test('enforces minimumReliability constraint', () => {
    const candidates = registry.getAllProviders();
    const result = filter.filter(candidates, {
      capabilities: ['REASONING'],
      reasoningLevel: 'basic',
      toolUseRequired: false,
      externalAccessRequired: false,
      localOnly: false,
      privacyLevel: 'standard',
      multiStep: false,
      minimumReliability: 0.99, // Only very reliable
    });

    // Research agent has 0.92 reliability -> rejected
    expect(result.rejected.some((r) => r.providerId === 'research_agent')).toBe(true);
  });
});
