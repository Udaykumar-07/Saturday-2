/**
 * Capability Registry — central registry for all action capabilities.
 * Capabilities register themselves here; the ActionExecutor looks them up by ID.
 * Platform-agnostic: both Android and future iOS capabilities use the same interface.
 */

import { Capability, CapabilityDefinition } from '../types/action';

export class CapabilityRegistry {
  private capabilities: Map<string, Capability> = new Map();

  /** Register a capability handler. */
  register(capability: Capability): void {
    this.capabilities.set(capability.definition.id, capability);
  }

  /** Unregister a capability by ID. */
  unregister(capabilityId: string): void {
    this.capabilities.delete(capabilityId);
  }

  /** Get a capability by ID. */
  get(capabilityId: string): Capability | undefined {
    return this.capabilities.get(capabilityId);
  }

  /** Check if a capability is registered. */
  has(capabilityId: string): boolean {
    return this.capabilities.has(capabilityId);
  }

  /** Get all registered capability definitions. */
  getAllDefinitions(): CapabilityDefinition[] {
    return Array.from(this.capabilities.values()).map((c) => c.definition);
  }

  /** Get capabilities available on the current device. */
  async getAvailable(): Promise<Capability[]> {
    const results = await Promise.all(
      Array.from(this.capabilities.values()).map(async (cap) => {
        try {
          const available = await cap.isAvailable();
          return available ? cap : null;
        } catch {
          return null;
        }
      })
    );
    return results.filter((c): c is Capability => c !== null);
  }

  /** Get the count of registered capabilities. */
  get count(): number {
    return this.capabilities.size;
  }
}
