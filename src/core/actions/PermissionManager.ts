/**
 * Permission Manager — risk classification and permission checking.
 * Decides whether an action can proceed automatically or needs user confirmation.
 * Tracks session-level permission grants.
 */

import { ActionIntent, PermissionCheckResult, RiskLevel } from '../types/action';

export class PermissionManager {
  /**
   * Session-level grants: capability IDs the user has approved this session.
   * Cleared when the app restarts — never persisted.
   */
  private sessionGrants: Set<string> = new Set();

  /**
   * Check whether all permissions are satisfied for an action.
   * Phase 2: permission checking is based on risk level and session grants.
   * Future: integrate with Android runtime permissions.
   */
  checkPermissions(intent: ActionIntent): PermissionCheckResult {
    // Low-risk actions are always granted
    if (intent.riskLevel === 'low') {
      return { granted: true, missing: [] };
    }

    // If user already granted this capability this session, allow
    if (this.sessionGrants.has(intent.capability)) {
      return { granted: true, missing: [] };
    }

    // Medium and high risk need explicit confirmation
    return {
      granted: false,
      missing: [intent.capability],
    };
  }

  /**
   * Whether this intent requires user confirmation before execution.
   */
  requiresConfirmation(intent: ActionIntent): boolean {
    if (intent.riskLevel === 'low') {
      return false;
    }

    // Already approved this session
    if (this.sessionGrants.has(intent.capability)) {
      return false;
    }

    return true;
  }

  /**
   * Grant permission for a capability for this session.
   */
  grantSession(capabilityId: string): void {
    this.sessionGrants.add(capabilityId);
  }

  /**
   * Revoke a session grant.
   */
  revokeSession(capabilityId: string): void {
    this.sessionGrants.delete(capabilityId);
  }

  /**
   * Clear all session grants.
   */
  clearSession(): void {
    this.sessionGrants.clear();
  }

  /**
   * Get the effective risk level for display purposes.
   */
  getEffectiveRisk(riskLevel: RiskLevel): string {
    switch (riskLevel) {
      case 'low':
        return 'Safe — no confirmation needed';
      case 'medium':
        return 'Moderate — requires approval';
      case 'high':
        return 'High — requires explicit confirmation';
    }
  }
}
