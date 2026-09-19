/**
 * Tests for ActionValidator.
 */

import { ActionValidator } from '../core/actions/ActionValidator';
import { CapabilityRegistry } from '../core/actions/CapabilityRegistry';
import { ActionIntent, Capability, CapabilityDefinition } from '../core/types/action';

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

function createIntent(overrides: Partial<ActionIntent> = {}): ActionIntent {
  return {
    id: 'test_intent',
    capability: 'test.cap',
    params: {},
    riskLevel: 'low',
    requiresConfirmation: false,
    description: 'Test action',
    ...overrides,
  };
}

describe('ActionValidator', () => {
  let registry: CapabilityRegistry;
  let validator: ActionValidator;

  beforeEach(() => {
    registry = new CapabilityRegistry();
    registry.register({
      definition: {
        id: 'test.cap',
        name: 'Test',
        category: 'device',
        riskLevel: 'low',
        requiredPermissions: [],
        platform: 'any',
      } as CapabilityDefinition,
      execute: jest.fn(),
      isAvailable: jest.fn().mockResolvedValue(true),
    } as Capability);
    validator = new ActionValidator(registry);
  });

  test('valid intent passes validation', () => {
    const result = validator.validate(createIntent());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('missing capability fails', () => {
    const result = validator.validate(createIntent({ capability: 'nonexistent' }));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('not registered');
  });

  test('missing id fails', () => {
    const result = validator.validate(createIntent({ id: '' }));
    expect(result.valid).toBe(false);
  });

  test('missing description fails', () => {
    const result = validator.validate(createIntent({ description: '' }));
    expect(result.valid).toBe(false);
  });

  test('high risk without confirmation fails', () => {
    const result = validator.validate(
      createIntent({ riskLevel: 'high', requiresConfirmation: false })
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('confirmation');
  });

  test('wrong platform fails', () => {
    registry.register({
      definition: {
        id: 'ios.only',
        name: 'iOS Only',
        category: 'device',
        riskLevel: 'low',
        requiredPermissions: [],
        platform: 'ios',
      } as CapabilityDefinition,
      execute: jest.fn(),
      isAvailable: jest.fn().mockResolvedValue(true),
    } as Capability);

    const result = validator.validate(createIntent({ capability: 'ios.only' }));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('platform');
  });
});
