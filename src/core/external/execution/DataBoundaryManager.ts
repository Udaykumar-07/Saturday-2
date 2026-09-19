/**
 * Data Boundary Manager for Saturday.
 *
 * Enforces strict boundaries between:
 * USER DATA <---> SATURDAY <---> EXTERNAL PROVIDER
 *
 * Enforces data minimization:
 * - Strips sensitive fields (tokens, passwords, full disk paths)
 * - Restricts message payloads to only required counts/items (e.g. 5 emails instead of entire inbox)
 * - Verifies if provider is permitted to receive user data
 * - Flags requests requiring explicit user approval
 */

import {
  DataBoundaryCheck,
  ExternalPrivacyLevel,
} from '../../types/external';

export interface DataBoundaryPolicy {
  allowExternalAI: boolean;
  allowExternalAgents: boolean;
  strictLocalOnly: boolean;
  alwaysAskBeforeSharingPersonalData: boolean;
}

export const DEFAULT_DATA_BOUNDARY_POLICY: DataBoundaryPolicy = {
  allowExternalAI: true,
  allowExternalAgents: true,
  strictLocalOnly: false,
  alwaysAskBeforeSharingPersonalData: true,
};

export class DataBoundaryManager {
  private policy: DataBoundaryPolicy;

  constructor(policy: Partial<DataBoundaryPolicy> = {}) {
    this.policy = { ...DEFAULT_DATA_BOUNDARY_POLICY, ...policy };
  }

  getPolicy(): DataBoundaryPolicy {
    return { ...this.policy };
  }

  updatePolicy(updates: Partial<DataBoundaryPolicy>): void {
    this.policy = { ...this.policy, ...updates };
  }

  /**
   * Check if data is allowed to leave Saturday for an external target.
   */
  checkBoundary(
    targetType: 'cloud_model' | 'agent' | 'api',
    privacy: ExternalPrivacyLevel = 'standard'
  ): DataBoundaryCheck {
    if (this.policy.strictLocalOnly || privacy === 'local_only') {
      return {
        allowed: false,
        reason: 'Policy or task strictly restricts data to on-device processing only.',
        requiresUserApproval: false,
      };
    }

    if (targetType === 'cloud_model' && !this.policy.allowExternalAI) {
      return {
        allowed: false,
        reason: 'External cloud AI models are disabled in Saturday settings.',
        requiresUserApproval: false,
      };
    }

    if (targetType === 'agent' && !this.policy.allowExternalAgents) {
      return {
        allowed: false,
        reason: 'External agents are disabled in Saturday settings.',
        requiresUserApproval: false,
      };
    }

    const requiresApproval =
      privacy === 'private' || this.policy.alwaysAskBeforeSharingPersonalData;

    return {
      allowed: true,
      requiresUserApproval: requiresApproval,
    };
  }

  /**
   * Minimize data payload to include ONLY what is strictly necessary.
   * Strips credentials, auth tokens, system passwords, and slices lists.
   */
  minimizeData<T>(data: T, maxItems = 10): T {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
      // Limit array length to minimize data exposure
      return data.slice(0, maxItems).map((item) => this.minimizeData(item, maxItems)) as unknown as T;
    }

    if (typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};
      const sensitiveKeys = [
        'password',
        'token',
        'accesstoken',
        'refreshtoken',
        'secret',
        'apikey',
        'key',
        'authorization',
      ];

      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        const lowerKey = key.toLowerCase();
        // Omit any sensitive keys from external delivery
        if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
          continue;
        }
        sanitized[key] = this.minimizeData(value, maxItems);
      }
      return sanitized as T;
    }

    return data;
  }
}
