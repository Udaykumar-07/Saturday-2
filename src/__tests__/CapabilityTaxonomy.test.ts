/**
 * Tests for Capability Taxonomy.
 */

import {
  CAPABILITIES,
  normalizeCapability,
  getCapabilityCategory,
  isCapabilityMatch,
  calculateCapabilityCoverage,
} from '../intelligence/registry/CapabilityTaxonomy';

describe('CapabilityTaxonomy', () => {
  test('normalizes legacy and dotted capability strings', () => {
    expect(normalizeCapability('chat')).toBe('TEXT_GENERATION');
    expect(normalizeCapability('general')).toBe('TEXT_GENERATION');
    expect(normalizeCapability('media.play')).toBe('MEDIA_PLAYBACK');
    expect(normalizeCapability('app.launch')).toBe('APP_MANAGEMENT');
    expect(normalizeCapability('device.info')).toBe('DEVICE_INFO');
    expect(normalizeCapability('gmail.read_latest')).toBe('EMAIL_ACCESS');
    expect(normalizeCapability('agent.research')).toBe('RESEARCH');
    expect(normalizeCapability('web.search')).toBe('WEB_SEARCH');
  });

  test('categorizes capabilities correctly', () => {
    expect(getCapabilityCategory(CAPABILITIES.TEXT_GENERATION)).toBe('generation');
    expect(getCapabilityCategory(CAPABILITIES.REASONING)).toBe('reasoning');
    expect(getCapabilityCategory(CAPABILITIES.CODING)).toBe('coding');
    expect(getCapabilityCategory(CAPABILITIES.RESEARCH)).toBe('research');
    expect(getCapabilityCategory(CAPABILITIES.ANDROID_CONTROL)).toBe('device');
    expect(getCapabilityCategory(CAPABILITIES.EMAIL_ACCESS)).toBe('communication');
  });

  test('matches capabilities directly and via hierarchy implications', () => {
    // Exact match
    expect(isCapabilityMatch('TEXT_GENERATION', 'TEXT_GENERATION')).toBe(true);

    // Alias match
    expect(isCapabilityMatch('chat', 'TEXT_GENERATION')).toBe(true);

    // Hierarchy implication: DEEP_REASONING implies REASONING
    expect(isCapabilityMatch('REASONING', 'DEEP_REASONING')).toBe(true);

    // Hierarchy implication: RESEARCH implies WEB_SEARCH
    expect(isCapabilityMatch('WEB_SEARCH', 'RESEARCH')).toBe(true);

    // Hierarchy implication: ANDROID_CONTROL implies MEDIA_PLAYBACK
    expect(isCapabilityMatch('MEDIA_PLAYBACK', 'ANDROID_CONTROL')).toBe(true);

    // Negative match: basic REASONING does not imply DEEP_REASONING
    expect(isCapabilityMatch('DEEP_REASONING', 'REASONING')).toBe(false);

    // Unrelated capabilities do not match
    expect(isCapabilityMatch('CODING', 'EMAIL_ACCESS')).toBe(false);
  });

  test('calculates capability coverage percentage', () => {
    const required = ['TEXT_GENERATION', 'REASONING'];
    const providedFull = ['TEXT_GENERATION', 'DEEP_REASONING'];
    const providedPartial = ['TEXT_GENERATION'];
    const providedNone = ['EMAIL_ACCESS'];

    expect(calculateCapabilityCoverage(required, providedFull)).toBe(1.0);
    expect(calculateCapabilityCoverage(required, providedPartial)).toBe(0.5);
    expect(calculateCapabilityCoverage(required, providedNone)).toBe(0.0);
    expect(calculateCapabilityCoverage([], providedFull)).toBe(1.0);
  });
});
