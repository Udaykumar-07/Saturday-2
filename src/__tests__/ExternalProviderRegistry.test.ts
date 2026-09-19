/**
 * Tests for ExternalProviderRegistry.
 */

import { ExternalProviderRegistry } from '../core/external/providers/ExternalProviderRegistry';
import { ExternalIntelligenceProvider, ExternalRequest, ExternalResponse } from '../core/types/external';

function createMockProvider(
  id: string,
  type: 'cloud_model' | 'agent' | 'api' | 'tool',
  capabilities: string[],
  available = true
): ExternalIntelligenceProvider {
  return {
    id,
    name: `Mock Provider ${id}`,
    type,
    isAvailable: jest.fn().mockResolvedValue(available),
    getCapabilities: jest.fn().mockResolvedValue(capabilities),
    execute: jest.fn().mockImplementation(async (req: ExternalRequest): Promise<ExternalResponse> => ({
      taskId: req.taskId,
      status: 'completed',
      providerId: id,
      result: { ok: true },
    })),
  };
}

describe('ExternalProviderRegistry', () => {
  let registry: ExternalProviderRegistry;

  beforeEach(() => {
    registry = new ExternalProviderRegistry();
  });

  test('registers and retrieves external providers', () => {
    const provider = createMockProvider('p1', 'cloud_model', ['reasoning']);
    registry.register(provider);

    expect(registry.get('p1')).toBe(provider);
    expect(registry.count).toBe(1);
    expect(registry.list()).toContain(provider);
  });

  test('unregisters an external provider', () => {
    const provider = createMockProvider('p1', 'cloud_model', ['reasoning']);
    registry.register(provider);
    registry.unregister('p1');

    expect(registry.get('p1')).toBeUndefined();
    expect(registry.count).toBe(0);
  });

  test('finds providers by capability', async () => {
    const p1 = createMockProvider('p1', 'cloud_model', ['reasoning', 'coding']);
    const p2 = createMockProvider('p2', 'cloud_model', ['vision']);
    registry.register(p1);
    registry.register(p2);

    const matching = await registry.findByCapability('reasoning');
    expect(matching).toHaveLength(1);
    expect(matching[0].id).toBe('p1');
  });

  test('filters providers by type', () => {
    const p1 = createMockProvider('p1', 'cloud_model', ['reasoning']);
    const p2 = createMockProvider('p2', 'api', ['gmail.read_latest']);
    registry.register(p1);
    registry.register(p2);

    const cloudModels = registry.findByType('cloud_model');
    const apis = registry.findByType('api');

    expect(cloudModels).toHaveLength(1);
    expect(cloudModels[0].id).toBe('p1');
    expect(apis).toHaveLength(1);
    expect(apis[0].id).toBe('p2');
  });

  test('filters available providers', async () => {
    const p1 = createMockProvider('p1', 'cloud_model', ['reasoning'], true);
    const p2 = createMockProvider('p2', 'cloud_model', ['reasoning'], false);
    registry.register(p1);
    registry.register(p2);

    const available = await registry.getAvailable();
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe('p1');
  });
});
