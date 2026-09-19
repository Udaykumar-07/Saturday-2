/**
 * Registry for External Intelligence Providers.
 *
 * Allows dynamic registration and lookup of external models, agents, APIs, and tools.
 * Supports discovery by capability without hardcoding specific AI providers.
 */

import {
  ExternalIntelligenceProvider,
  ExternalProviderType,
} from '../../types/external';

export class ExternalProviderRegistry {
  private providers: Map<string, ExternalIntelligenceProvider> = new Map();

  /**
   * Register a new external provider.
   */
  register(provider: ExternalIntelligenceProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Unregister an external provider by ID.
   */
  unregister(providerId: string): void {
    this.providers.delete(providerId);
  }

  /**
   * Get an external provider by ID.
   */
  get(id: string): ExternalIntelligenceProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * List all registered external providers.
   */
  list(): ExternalIntelligenceProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Find providers that support a specific capability.
   */
  async findByCapability(capability: string): Promise<ExternalIntelligenceProvider[]> {
    const matching: ExternalIntelligenceProvider[] = [];
    for (const provider of this.providers.values()) {
      try {
        const caps = await provider.getCapabilities();
        if (caps.includes(capability)) {
          matching.push(provider);
        }
      } catch {
        // Skip provider if checking capabilities fails
      }
    }
    return matching;
  }

  /**
   * Filter registered providers by type (cloud_model, agent, api, tool).
   */
  findByType(type: ExternalProviderType): ExternalIntelligenceProvider[] {
    return this.list().filter((p) => p.type === type);
  }

  /**
   * Retrieve all currently available providers.
   */
  async getAvailable(): Promise<ExternalIntelligenceProvider[]> {
    const results = await Promise.all(
      this.list().map(async (provider) => {
        try {
          const available = await provider.isAvailable();
          return available ? provider : null;
        } catch {
          return null;
        }
      })
    );
    return results.filter((p): p is ExternalIntelligenceProvider => p !== null);
  }

  /**
   * Total number of registered providers.
   */
  get count(): number {
    return this.providers.size;
  }
}
