/**
 * Tests for DataBoundaryManager (privacy policy & minimization).
 */

import { DataBoundaryManager } from '../core/external/execution/DataBoundaryManager';

describe('DataBoundaryManager', () => {
  let boundary: DataBoundaryManager;

  beforeEach(() => {
    boundary = new DataBoundaryManager();
  });

  test('allows cloud model transfer under standard policy', () => {
    const check = boundary.checkBoundary('cloud_model', 'standard');
    expect(check.allowed).toBe(true);
  });

  test('blocks cloud model transfer if external AI is disabled', () => {
    boundary.updatePolicy({ allowExternalAI: false });

    const check = boundary.checkBoundary('cloud_model', 'standard');
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('disabled');
  });

  test('blocks agent transfer if external agents are disabled', () => {
    boundary.updatePolicy({ allowExternalAgents: false });

    const check = boundary.checkBoundary('agent', 'standard');
    expect(check.allowed).toBe(false);
  });

  test('blocks transfer if strict local-only policy is enabled', () => {
    boundary.updatePolicy({ strictLocalOnly: true });

    const check = boundary.checkBoundary('cloud_model', 'standard');
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('strictly restricts data');
  });

  test('flags private data for user approval', () => {
    const check = boundary.checkBoundary('cloud_model', 'private');
    expect(check.allowed).toBe(true);
    expect(check.requiresUserApproval).toBe(true);
  });

  test('minimizes data by stripping sensitive tokens and keys', () => {
    const rawData = {
      user: 'Alice',
      query: 'Latest news',
      accessToken: 'secret_12345',
      apiKey: 'key_xyz',
      refreshToken: 'refresh_abc',
      safeData: {
        item: 'Report',
        password: 'cleartext_pwd',
      },
    };

    const sanitized = boundary.minimizeData(rawData) as Record<string, unknown>;

    expect(sanitized.user).toBe('Alice');
    expect(sanitized.query).toBe('Latest news');
    expect(sanitized.accessToken).toBeUndefined();
    expect(sanitized.apiKey).toBeUndefined();
    expect(sanitized.refreshToken).toBeUndefined();

    const nested = sanitized.safeData as Record<string, unknown>;
    expect(nested.item).toBe('Report');
    expect(nested.password).toBeUndefined();
  });

  test('minimizes arrays by limiting count', () => {
    const largeList = Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Item ${i}` }));
    const minimized = boundary.minimizeData(largeList, 5);

    expect(minimized).toHaveLength(5);
    expect(minimized[0].id).toBe(0);
    expect(minimized[4].id).toBe(4);
  });
});
