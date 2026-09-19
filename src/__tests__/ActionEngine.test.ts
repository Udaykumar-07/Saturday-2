/**
 * Tests for ActionEngine — the core state machine.
 */

import { ActionEngine } from '../core/actions/ActionEngine';
import { CapabilityRegistry } from '../core/actions/CapabilityRegistry';
import { ActionIntent, ActionResult, Capability, CapabilityDefinition } from '../core/types/action';

// Mock capability for testing
function createMockCapability(
  id: string,
  result: ActionResult = { success: true, data: { mock: true } },
  available = true
): Capability {
  return {
    definition: {
      id,
      name: `Mock ${id}`,
      category: 'device',
      riskLevel: 'low',
      requiredPermissions: [],
      platform: 'any',
    } as CapabilityDefinition,
    execute: jest.fn().mockResolvedValue(result),
    isAvailable: jest.fn().mockResolvedValue(available),
  };
}

function createIntent(
  capability: string,
  overrides: Partial<ActionIntent> = {}
): ActionIntent {
  return {
    id: `test_intent_${Date.now()}`,
    capability,
    params: {},
    riskLevel: 'low',
    requiresConfirmation: false,
    description: `Test ${capability}`,
    ...overrides,
  };
}

describe('ActionEngine', () => {
  let registry: CapabilityRegistry;
  let engine: ActionEngine;

  beforeEach(() => {
    registry = new CapabilityRegistry();
    registry.register(createMockCapability('test.action'));
    registry.register(createMockCapability('test.risky', { success: true }, true));
    engine = new ActionEngine(registry);
  });

  test('planAction creates action in PLANNED state', () => {
    const intent = createIntent('test.action');
    const action = engine.planAction(intent);

    expect(action.state).toBe('PLANNED');
    expect(action.intent).toBe(intent);
    expect(action.id).toBeTruthy();
  });

  test('executeAction completes successfully for valid low-risk action', async () => {
    const intent = createIntent('test.action');
    const action = engine.planAction(intent);
    const result = await engine.executeAction(action.id);

    expect(result.success).toBe(true);

    const finalAction = engine.getAction(action.id);
    expect(finalAction?.state).toBe('COMPLETED');
  });

  test('executeAction fails when capability not registered', async () => {
    const intent = createIntent('nonexistent.action');
    const action = engine.planAction(intent);
    const result = await engine.executeAction(action.id);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not registered');

    const finalAction = engine.getAction(action.id);
    expect(finalAction?.state).toBe('FAILED');
  });

  test('executeAction returns awaiting confirmation for medium-risk action', async () => {
    const intent = createIntent('test.risky', {
      riskLevel: 'medium',
      requiresConfirmation: true,
    });
    const action = engine.planAction(intent);
    const result = await engine.executeAction(action.id);

    expect(result.data?.awaitingConfirmation).toBe(true);

    const pending = engine.getPendingAction();
    expect(pending?.id).toBe(action.id);
    expect(pending?.state).toBe('AWAITING_PERMISSION');
  });

  test('confirmAction resumes execution', async () => {
    const intent = createIntent('test.risky', {
      riskLevel: 'medium',
      requiresConfirmation: true,
    });
    const action = engine.planAction(intent);
    await engine.executeAction(action.id);

    const result = await engine.confirmAction(action.id);
    expect(result.success).toBe(true);

    const finalAction = engine.getAction(action.id);
    expect(finalAction?.state).toBe('COMPLETED');
  });

  test('denyAction cancels pending action', async () => {
    const intent = createIntent('test.risky', {
      riskLevel: 'medium',
      requiresConfirmation: true,
    });
    const action = engine.planAction(intent);
    await engine.executeAction(action.id);

    engine.denyAction(action.id);

    const finalAction = engine.getAction(action.id);
    expect(finalAction?.state).toBe('CANCELLED');
  });

  test('onStateChange notifies listeners', async () => {
    const states: string[] = [];
    engine.onStateChange((action) => states.push(action.state));

    const intent = createIntent('test.action');
    const action = engine.planAction(intent);
    await engine.executeAction(action.id);

    expect(states).toContain('PLANNED');
    expect(states).toContain('COMPLETED');
  });

  test('executePlan runs multiple steps sequentially', async () => {
    const intents = [
      createIntent('test.action', { description: 'Step 1' }),
      createIntent('test.action', { description: 'Step 2' }),
    ];

    const { results, allSucceeded } = await engine.executePlan(intents);

    expect(allSucceeded).toBe(true);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.success)).toBe(true);
  });

  test('executePlan stops on failure', async () => {
    registry.register(
      createMockCapability('test.fail', { success: false, error: 'fail' })
    );

    const intents = [
      createIntent('test.fail', { description: 'Will fail' }),
      createIntent('test.action', { description: 'Should not run' }),
    ];

    const { results, allSucceeded } = await engine.executePlan(intents);

    expect(allSucceeded).toBe(false);
    expect(results).toHaveLength(1);
  });

  test('getRecentActions returns actions sorted by updatedAt', () => {
    engine.planAction(createIntent('test.action', { description: 'First' }));
    engine.planAction(createIntent('test.action', { description: 'Second' }));

    const recent = engine.getRecentActions(10);
    expect(recent.length).toBe(2);
    expect(recent[0].updatedAt).toBeGreaterThanOrEqual(recent[1].updatedAt);
  });
});
