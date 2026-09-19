/**
 * Tests for ExternalResultVerifier.
 */

import { ExternalResultVerifier } from '../core/external/execution/ExternalResultVerifier';
import { ExternalResponse } from '../core/types/external';

describe('ExternalResultVerifier', () => {
  let verifier: ExternalResultVerifier;

  beforeEach(() => {
    verifier = new ExternalResultVerifier();
  });

  test('verifies valid Gmail message array', () => {
    const response: ExternalResponse = {
      taskId: 't1',
      status: 'completed',
      providerId: 'gmail_provider',
      result: {
        messages: [
          { id: '1', from: 'Alice', subject: 'Hello', date: 'Today', snippet: 'Hi' },
        ],
      },
    };

    const res = verifier.verify(response, 'gmail.read_latest');
    expect(res.verified).toBe(true);
    expect(res.details).toContain('Verified 1 retrieved Gmail message');
  });

  test('fails when Gmail result lacks messages array', () => {
    const response: ExternalResponse = {
      taskId: 't2',
      status: 'completed',
      providerId: 'gmail_provider',
      result: { notMessages: true },
    };

    const res = verifier.verify(response, 'gmail.read_latest');
    expect(res.verified).toBe(false);
    expect(res.details).toContain('does not contain a valid messages array');
  });

  test('fails when completed response has null result', () => {
    const response: ExternalResponse = {
      taskId: 't3',
      status: 'completed',
      providerId: 'some_provider',
      result: null,
    };

    const res = verifier.verify(response, 'general');
    expect(res.verified).toBe(false);
    expect(res.details).toContain('no result payload');
  });

  test('verifies response requiring user authentication', () => {
    const response: ExternalResponse = {
      taskId: 't4',
      status: 'requires_authentication',
      providerId: 'gmail_provider',
    };

    const res = verifier.verify(response, 'gmail.read_latest');
    expect(res.verified).toBe(true);
    expect(res.details).toContain('paused awaiting user interaction');
  });

  test('fails on explicit error status', () => {
    const response: ExternalResponse = {
      taskId: 't5',
      status: 'failed',
      providerId: 'cloud_ai',
      error: 'Rate limit exceeded',
    };

    const res = verifier.verify(response, 'reasoning');
    expect(res.verified).toBe(false);
    expect(res.details).toContain('Rate limit exceeded');
  });
});
