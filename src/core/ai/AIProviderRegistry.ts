/**
 * Registry for AI providers.
 * All AI interactions go through this registry — the UI never
 * communicates directly with a specific provider.
 */

import { AIProvider } from '../types/ai';
import { AIProviderUnavailableError } from '../types/errors';

export class AIProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();

  /** Register a provider. */
  register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  /** Unregister a provider by ID. */
  unregister(providerId: string): void {
    this.providers.delete(providerId);
  }

  /** Get a provider by ID. */
  getProvider(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  /** Get all registered providers. */
  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /** Get all currently available providers. */
  async getAvailableProviders(): Promise<AIProvider[]> {
    const results = await Promise.all(
      this.getAllProviders().map(async (provider) => {
        try {
          const available = await provider.isAvailable();
          return available ? provider : null;
        } catch {
          return null;
        }
      })
    );
    return results.filter((p): p is AIProvider => p !== null);
  }

  /** Get the first available provider, or throw. */
  async getFirstAvailable(): Promise<AIProvider> {
    const available = await this.getAvailableProviders();
    if (available.length === 0) {
      throw new AIProviderUnavailableError();
    }
    return available[0];
  }

  /** Check if any provider is available. */
  async hasAvailableProvider(): Promise<boolean> {
    const available = await this.getAvailableProviders();
    return available.length > 0;
  }

  /** Get the count of registered providers. */
  get count(): number {
    return this.providers.size;
  }
}
