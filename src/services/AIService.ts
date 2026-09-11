/**
 * Central AI orchestration service.
 * Coordinates context building, routing, and provider calls.
 * This is the single entry point for AI operations outside of conversations.
 */

import { AIRequest, AIResponse } from '../core/types/ai';
import { AIProviderRegistry } from '../core/ai/AIProviderRegistry';
import { AIRouter } from '../core/routing/AIRouter';
import { ContextService } from '../core/context/ContextService';
import { AIProviderUnavailableError, MalformedResponseError } from '../core/types/errors';

export class AIService {
  constructor(
    private registry: AIProviderRegistry,
    private router: AIRouter,
    private contextService: ContextService
  ) {}

  /**
   * Generate an AI response for a request.
   * Routes to the best available provider.
   */
  async generate(request: AIRequest): Promise<AIResponse> {
    // Build context if not provided
    if (!request.context) {
      request.context = await this.contextService.buildContext();
    }

    // Route to provider
    const decision = await this.router.route(request.taskType);
    const provider = this.registry.getProvider(decision.providerId);

    if (!provider) {
      throw new AIProviderUnavailableError();
    }

    // Generate response
    const response = await provider.generate(request);

    if (!response.content || typeof response.content !== 'string') {
      throw new MalformedResponseError();
    }

    return response;
  }

  /** Check if any AI provider is available. */
  async isAvailable(): Promise<boolean> {
    return this.registry.hasAvailableProvider();
  }
}
