/**
 * Context service that aggregates context from multiple providers.
 * Provides situational awareness to AI requests.
 */

import { AIContext, ContextProvider } from '../types/context';

export class ContextService {
  private providers: Map<string, ContextProvider> = new Map();

  /** Register a context provider. */
  registerProvider(provider: ContextProvider): void {
    this.providers.set(provider.id, provider);
  }

  /** Unregister a context provider. */
  unregisterProvider(providerId: string): void {
    this.providers.delete(providerId);
  }

  /** Build a complete context by aggregating all providers. */
  async buildContext(): Promise<AIContext> {
    const context: AIContext = {};

    for (const provider of this.providers.values()) {
      try {
        const partialContext = await provider.getContext();
        Object.assign(context, partialContext);
      } catch {
        // Don't let one provider failure break the entire context
        // In the future, log this for debugging
      }
    }

    return context;
  }

  /** Get list of registered provider IDs. */
  getProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }
}
