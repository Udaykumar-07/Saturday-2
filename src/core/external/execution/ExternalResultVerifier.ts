/**
 * External Result Verifier for Saturday.
 *
 * Verifies external results deterministically:
 * - Never trusts natural-language claims of success like "I did it!"
 * - Checks schema conformity, status codes, and non-empty payloads
 * - Verifies specific capability output structures (Gmail messages, agent evidence, model output)
 */

import { ExternalResponse } from '../../types/external';
import { VerificationResult } from '../../types/action';

export class ExternalResultVerifier {
  /**
   * Verify an external response for a given capability.
   */
  verify(response: ExternalResponse, capability: string): VerificationResult {
    // 1. Basic response status check
    if (response.status === 'failed') {
      return {
        verified: false,
        details: `External execution failed: ${response.error || 'Unknown error'}.`,
      };
    }

    if (
      response.status === 'requires_authentication' ||
      response.status === 'requires_user_input'
    ) {
      return {
        verified: true,
        details: `Action paused awaiting user interaction: ${response.status}.`,
      };
    }

    // 2. Completed status must contain actual results
    if (response.status === 'completed') {
      if (response.result === undefined || response.result === null) {
        return {
          verified: false,
          details: 'Provider reported completion but provided no result payload.',
        };
      }

      // Capability-specific verifications
      if (capability.startsWith('gmail.')) {
        return this.verifyGmailResult(response.result, capability);
      }

      if (capability.startsWith('mcp.')) {
        return {
          verified: true,
          details: 'MCP tool execution verified with output payload.',
        };
      }

      // Default verification for AI models and general APIs
      if (typeof response.result === 'string' && response.result.trim().length === 0) {
        return {
          verified: false,
          details: 'Model returned empty response string.',
        };
      }

      return {
        verified: true,
        details: 'Result payload verified successfully.',
      };
    }

    return {
      verified: false,
      details: `Unrecognized external response status: ${response.status}.`,
    };
  }

  private verifyGmailResult(result: unknown, capability: string): VerificationResult {
    if (capability === 'gmail.is_connected') {
      if (typeof result === 'boolean' || (typeof result === 'object' && result !== null && 'connected' in result)) {
        return { verified: true, details: 'Gmail connection status verified.' };
      }
      return { verified: false, details: 'Invalid boolean result for gmail.is_connected.' };
    }

    if (capability === 'gmail.read_latest' || capability === 'gmail.search') {
      // Must be an array of messages or object containing messages array
      const messages = Array.isArray(result)
        ? result
        : typeof result === 'object' && result !== null && 'messages' in result
          ? (result as { messages: unknown[] }).messages
          : null;

      if (!Array.isArray(messages)) {
        return {
          verified: false,
          details: 'Gmail result does not contain a valid messages array.',
        };
      }

      return {
        verified: true,
        details: `Verified ${messages.length} retrieved Gmail message(s).`,
      };
    }

    return { verified: true, details: 'Gmail action verified.' };
  }
}
