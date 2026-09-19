/**
 * Registry for External Agents.
 *
 * Allows agents (Research, Travel, Coding, etc.) to advertise their capabilities,
 * supported protocols, and authentication requirements.
 */

import { AgentDefinition } from '../../types/external';

export class AgentRegistry {
  private agents: Map<string, AgentDefinition> = new Map();

  /**
   * Register a new external agent definition.
   */
  register(agent: AgentDefinition): void {
    this.agents.set(agent.id, agent);
  }

  /**
   * Unregister an agent by ID.
   */
  unregister(agentId: string): void {
    this.agents.delete(agentId);
  }

  /**
   * Get an agent definition by ID.
   */
  get(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  /**
   * List all registered agents.
   */
  list(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  /**
   * Find agents that advertise a specific capability.
   */
  findByCapability(capability: string): AgentDefinition[] {
    return this.list().filter((agent) =>
      agent.capabilities.includes(capability)
    );
  }

  /**
   * Find agents matching a set of required capabilities.
   */
  findByCapabilities(capabilities: string[]): AgentDefinition[] {
    return this.list().filter((agent) =>
      capabilities.every((cap) => agent.capabilities.includes(cap))
    );
  }

  /**
   * List agents that are currently available.
   */
  async getAvailable(): Promise<AgentDefinition[]> {
    const results = await Promise.all(
      this.list().map(async (agent) => {
        try {
          const available = await agent.isAvailable();
          return available ? agent : null;
        } catch {
          return null;
        }
      })
    );
    return results.filter((a): a is AgentDefinition => a !== null);
  }

  /**
   * Number of registered agents.
   */
  get count(): number {
    return this.agents.size;
  }
}
