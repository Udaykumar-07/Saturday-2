/**
 * Tests for PermissionManager.
 */

import { PermissionManager } from '../core/actions/PermissionManager';
import { ActionIntent } from '../core/types/action';

function createIntent(overrides: Partial<ActionIntent> = {}): ActionIntent {
  return {
    id: 'test',
    capability: 'test.cap',
    params: {},
    riskLevel: 'low',
    requiresConfirmation: false,
    description: 'Test',
    ...overrides,
  };
}

describe('PermissionManager', () => {
  let pm: PermissionManager;

  beforeEach(() => {
    pm = new PermissionManager();
  });

  test('low-risk actions are always granted', () => {
    const result = pm.checkPermissions(createIntent({ riskLevel: 'low' }));
    expect(result.granted).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  test('medium-risk actions need confirmation', () => {
    const result = pm.checkPermissions(createIntent({ riskLevel: 'medium' }));
    expect(result.granted).toBe(false);
    expect(result.missing).toContain('test.cap');
  });

  test('high-risk actions need confirmation', () => {
    const result = pm.checkPermissions(createIntent({ riskLevel: 'high' }));
    expect(result.granted).toBe(false);
  });

  test('session grant bypasses confirmation', () => {
    pm.grantSession('test.cap');
    const result = pm.checkPermissions(createIntent({ riskLevel: 'medium' }));
    expect(result.granted).toBe(true);
  });

  test('requiresConfirmation returns false for low risk', () => {
    expect(pm.requiresConfirmation(createIntent({ riskLevel: 'low' }))).toBe(false);
  });

  test('requiresConfirmation returns true for medium risk', () => {
    expect(pm.requiresConfirmation(createIntent({ riskLevel: 'medium' }))).toBe(true);
  });

  test('requiresConfirmation returns false after session grant', () => {
    pm.grantSession('test.cap');
    expect(pm.requiresConfirmation(createIntent({ riskLevel: 'medium' }))).toBe(false);
  });

  test('revokeSession removes grant', () => {
    pm.grantSession('test.cap');
    pm.revokeSession('test.cap');
    expect(pm.requiresConfirmation(createIntent({ riskLevel: 'medium' }))).toBe(true);
  });

  test('clearSession removes all grants', () => {
    pm.grantSession('a');
    pm.grantSession('b');
    pm.clearSession();
    expect(pm.requiresConfirmation(createIntent({ riskLevel: 'medium', capability: 'a' }))).toBe(true);
  });

  test('getEffectiveRisk returns correct labels', () => {
    expect(pm.getEffectiveRisk('low')).toContain('Safe');
    expect(pm.getEffectiveRisk('medium')).toContain('Moderate');
    expect(pm.getEffectiveRisk('high')).toContain('High');
  });
});
