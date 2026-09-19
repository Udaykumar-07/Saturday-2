/**
 * Tests for CapabilityRegistry.
 */

import { CapabilityRegistry } from '../core/actions/CapabilityRegistry';
import { Capability, CapabilityDefinition } from '../core/types/action';

function mockCap(id: string, available = true): Capability {
  return {
    definition: {
      id,
      name: `Cap ${id}`,
      category: 'device',
      riskLevel: 'low',
      requiredPermissions: [],
      platform: 'any',
    } as CapabilityDefinition,
    execute: jest.fn().mockResolvedValue({ success: true }),
    isAvailable: jest.fn().mockResolvedValue(available),
  };
}

describe('CapabilityRegistry', () => {
  let registry: CapabilityRegistry;

  beforeEach(() => {
    registry = new CapabilityRegistry();
  });

  test('register and get capability', () => {
    registry.register(mockCap('test.a'));
    expect(registry.get('test.a')).toBeDefined();
    expect(registry.has('test.a')).toBe(true);
    expect(registry.count).toBe(1);
  });

  test('unregister removes capability', () => {
    registry.register(mockCap('test.a'));
    registry.unregister('test.a');
    expect(registry.has('test.a')).toBe(false);
    expect(registry.count).toBe(0);
  });

  test('getAllDefinitions returns all definitions', () => {
    registry.register(mockCap('test.a'));
    registry.register(mockCap('test.b'));
    const defs = registry.getAllDefinitions();
    expect(defs).toHaveLength(2);
    expect(defs.map((d) => d.id).sort()).toEqual(['test.a', 'test.b']);
  });

  test('getAvailable filters by availability', async () => {
    registry.register(mockCap('available', true));
    registry.register(mockCap('unavailable', false));
    const available = await registry.getAvailable();
    expect(available).toHaveLength(1);
    expect(available[0].definition.id).toBe('available');
  });

  test('get returns undefined for missing capability', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });
});
