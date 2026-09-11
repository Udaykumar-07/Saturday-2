/**
 * AI provider that always fails.
 * Used for testing error handling paths.
 */

import { AIProvider, AIRequest, AIResponse, IntelligenceCapability } from '../types/ai';
import { AIProviderError } from '../types/errors';

export class FailingAIProvider implements AIProvider {
  readonly id = 'failing';
  readonly name = 'Failing AI Provider (Test)';
  readonly type = 'local_model' as const;

  private errorMessage: string;
  private available: boolean;

  constructor(errorMessage = 'Intentional test failure', available = true) {
    this.errorMessage = errorMessage;
    this.available = available;
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async generate(_request: AIRequest): Promise<AIResponse> {
    throw new AIProviderError(this.errorMessage, this.id, false);
  }

  getCapabilities(): IntelligenceCapability[] {
    return [];
  }
}
