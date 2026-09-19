/**
 * Agent Communication Layer (ACL) for Saturday.
 *
 * Coordinates delegating structured tasks to external agents without Saturday
 * needing to know how those agents work internally.
 *
 * Enforces:
 * - Agent capability discovery
 * - Strict per-agent capability permission checks (agents never get blanket phone access)
 * - Result verification (Saturday never trusts "completed" on word alone)
 */

import {
  AgentTask,
  AgentResponse,
  AgentPermission,
  AgentDefinition,
  TaskRequirements,
} from '../../types/external';
import {
  AgentCommunicationError,
  ActionPermissionError,
  SaturdayError,
} from '../../types/errors';
import { AgentRegistry } from './AgentRegistry';
import { AgentClient } from './AgentClient';
import { AuthenticationManager } from '../authentication/AuthenticationManager';

export class AgentCommunicationLayer {
  private permissions: Map<string, Set<string>> = new Map(); // agentId -> Set<capability>
  private sessionPermissions: Set<string> = new Set(); // "agentId:capability"

  constructor(
    private agentRegistry: AgentRegistry,
    private agentClient: AgentClient,
    private authManager?: AuthenticationManager
  ) {}

  /**
   * Grant a capability permission to an agent.
   */
  grantPermission(permission: AgentPermission): void {
    if (!this.permissions.has(permission.agentId)) {
      this.permissions.set(permission.agentId, new Set());
    }
    this.permissions.get(permission.agentId)!.add(permission.capability);

    if (permission.scope === 'session' || permission.scope === 'once') {
      this.sessionPermissions.add(`${permission.agentId}:${permission.capability}`);
    }
  }

  /**
   * Check if an agent has permission to use a capability.
   */
  hasPermission(agentId: string, capability: string): boolean {
    const agentPerms = this.permissions.get(agentId);
    return agentPerms ? agentPerms.has(capability) : false;
  }

  /**
   * Revoke a capability permission from an agent.
   */
  revokePermission(agentId: string, capability: string): void {
    const agentPerms = this.permissions.get(agentId);
    if (agentPerms) {
      agentPerms.delete(capability);
    }
    this.sessionPermissions.delete(`${agentId}:${capability}`);
  }

  /**
   * Clear session-scoped permissions.
   */
  clearSessionPermissions(): void {
    for (const key of this.sessionPermissions) {
      const [agentId, capability] = key.split(':');
      this.revokePermission(agentId, capability);
    }
    this.sessionPermissions.clear();
  }

  /**
   * High-level delegation flow:
   * 1. Find capable agent
   * 2. Check required permissions
   * 3. Check authentication if required
   * 4. Send task via client
   * 5. Verify response
   */
  async delegateTask(
    task: AgentTask,
    _requirements?: TaskRequirements
  ): Promise<AgentResponse> {
    // 1. Find candidate agents
    const candidates = this.agentRegistry.findByCapabilities(
      task.requiredCapabilities
    );

    if (candidates.length === 0) {
      throw new AgentCommunicationError(
        `No registered agent found supporting capabilities: [${task.requiredCapabilities.join(', ')}].`
      );
    }

    // Select first available agent
    let selectedAgent: AgentDefinition | null = null;
    for (const candidate of candidates) {
      if (await candidate.isAvailable()) {
        selectedAgent = candidate;
        break;
      }
    }

    if (!selectedAgent) {
      throw new AgentCommunicationError(
        `All capable agents for [${task.requiredCapabilities.join(', ')}] are currently unavailable.`
      );
    }

    // 2. Check permissions for each required capability
    for (const cap of task.requiredCapabilities) {
      if (!this.hasPermission(selectedAgent.id, cap)) {
        throw new ActionPermissionError(
          `Agent "${selectedAgent.name}" lacks granted permission for capability "${cap}".`
        );
      }
    }

    // 3. Check authentication if agent requires it
    if (selectedAgent.requiresAuth && this.authManager) {
      const isAuthed = await this.authManager.isAuthenticated(selectedAgent.id);
      if (!isAuthed) {
        return {
          taskId: task.id,
          status: 'requires_user_input',
          error: `Agent "${selectedAgent.name}" requires authentication.`,
        };
      }
    }

    // 4. Delegate to agent
    const response = await this.agentClient.sendTask(selectedAgent.id, task);

    // 5. Verification: ensure non-empty result and valid status
    if (response.status === 'completed' && !response.result && !response.evidence) {
      throw new SaturdayError(
        `Agent "${selectedAgent.name}" claimed completion but returned no result or evidence.`,
        'AGENT_RESULT_UNVERIFIED',
        true
      );
    }

    return response;
  }
}
