/**
 * Local on-device AI provider.
 * This is a stub/adapter for a future on-device model runtime.
 * It does NOT fake inference by calling cloud APIs.
 */

import { AIProvider, AIRequest, AIResponse, IntelligenceCapability } from '../types/ai';
import { AIProviderError } from '../types/errors';

export class LocalAIProvider implements AIProvider {
  readonly id = 'local';
  readonly name = 'Local AI Model';
  readonly type = 'local_model' as const;

  /**
   * Check if a local model runtime is available.
   * Returns false until a real model runtime is configured.
   */
  async isAvailable(): Promise<boolean> {
    // Future: check if on-device model files exist and runtime is loaded
    return false;
  }

  /**
   * Generate a response using the local model.
   * Currently throws because no model runtime is available.
   */
  async generate(_request: AIRequest): Promise<AIResponse> {
    const available = await this.isAvailable();
    if (!available) {
      throw new AIProviderError(
        'Local AI model is not yet configured. Please set up an on-device model.',
        this.id,
        true
      );
    }

    // Future: invoke on-device model runtime here
    throw new AIProviderError(
      'Local model runtime not implemented.',
      this.id,
      true
    );
  }

  /** Get capabilities of the local model. */
  getCapabilities(): IntelligenceCapability[] {
    return [
      { id: 'chat', category: 'conversation' },
      { id: 'offline', category: 'availability' },
      { id: 'privacy', category: 'security' },
    ];
  }
}
