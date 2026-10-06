/**
 * OpenAI Provider Adapter.
 * 
 * Provides integration with OpenAI's API including GPT-4, GPT-4o, and o1 models.
 * Supports streaming responses, API key validation, and secure credential storage.
 */

import { BaseExternalProvider } from './ExternalProvider';
import type { ExternalRequest, ExternalResponse } from '../../types/external';
import type { StreamChunk, ProviderError, ProviderConfig } from './ProviderTypes';
import { CredentialStore } from '../authentication/CredentialStore';
import { 
  ExternalProviderError, 
  ProviderRateLimitError, 
  ProviderInvalidKeyError, 
  ProviderNetworkError 
} from '../../types/errors';

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const SERVICE_ID = 'openai_provider';

export class OpenAIProvider extends BaseExternalProvider {
  readonly id = SERVICE_ID;
  readonly name = 'OpenAI';
  readonly type = 'cloud_model' as const;

  private abortController?: AbortController;

  constructor(private credentialStore: CredentialStore) {
    super();
  }

  async isAvailable(): Promise<boolean> {
    const config = await this.credentialStore.retrieve<ProviderConfig>(SERVICE_ID);
    return config !== null && !!config.apiKey;
  }

  getCapabilities(): string[] {
    return [
      'TEXT_GENERATION',
      'REASONING',
      'DEEP_REASONING',
      'CODING',
      'VISION',
      'FUNCTION_CALLING',
      'STRUCTURED_OUTPUT',
    ];
  }

  async execute(request: ExternalRequest): Promise<ExternalResponse> {
    const startTime = Date.now();
    try {
      const config = await this.credentialStore.retrieve<ProviderConfig>(SERVICE_ID);
      if (!config || !config.apiKey) {
        return {
          taskId: request.taskId,
          status: 'requires_authentication',
          providerId: this.id,
          error: 'OpenAI API key not configured',
        };
      }

      const model = config.model || 'gpt-4o';
      let result = '';

      for await (const chunk of this.generateStream(String(request.input), model)) {
        result += chunk.text;
      }

      this.recordSuccess(Date.now() - startTime);
      return {
        taskId: request.taskId,
        status: 'completed',
        result,
        providerId: this.id,
      };
    } catch (error) {
      this.recordFailure();
      // Re-throw specific provider errors so they can be handled upstream
      if (
        error instanceof ProviderRateLimitError ||
        error instanceof ProviderInvalidKeyError ||
        error instanceof ProviderNetworkError
      ) {
        throw error;
      }
      return {
        taskId: request.taskId,
        status: 'failed',
        providerId: this.id,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate streaming response from OpenAI API.
   */
  async *generateStream(input: string, model: string): AsyncGenerator<StreamChunk> {
    const config = await this.credentialStore.retrieve<ProviderConfig>(SERVICE_ID);
    if (!config || !config.apiKey) {
      throw new ExternalProviderError('OpenAI API key not configured', this.id);
    }

    this.abortController = new AbortController();

    try {
      const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: input }],
          stream: true,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        // Throw specific error types based on HTTP status
        if (response.status === 429) {
          throw new ProviderRateLimitError(this.id);
        }
        if (response.status === 401 || response.status === 403) {
          throw new ProviderInvalidKeyError(this.id);
        }
        const error = await this.mapError(response);
        throw new ExternalProviderError(error.message, this.id, error.retryable);
      }

      if (!response.body) {
        throw new ExternalProviderError('No response body', this.id);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              yield { text: content, done: false };
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }

      yield { text: '', done: true };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new ExternalProviderError('Request cancelled', this.id, false);
      }
      // Handle network errors (no response at all)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ProviderNetworkError(this.id);
      }
      throw error;
    }
  }

  /**
   * Validate API key by making a test request to list models.
   */
  async validateApiKey(key: string): Promise<boolean> {
    try {
      const response = await fetch(`${OPENAI_API_BASE}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Store API key and model configuration securely.
   */
  async setApiKey(apiKey: string, model: string = 'gpt-4o'): Promise<void> {
    await this.credentialStore.store(SERVICE_ID, { apiKey, model });
  }

  /**
   * Cancel any ongoing streaming request.
   */
  cancel(): void {
    this.abortController?.abort();
  }

  /**
   * Map HTTP response to ProviderError.
   */
  private async mapError(response: Response): Promise<ProviderError> {
    const status = response.status;

    if (status === 401) {
      return {
        code: 'INVALID_KEY',
        message: 'Invalid OpenAI API key',
        retryable: false,
      };
    }

    if (status === 429) {
      return {
        code: 'RATE_LIMIT',
        message: 'OpenAI API rate limit exceeded',
        retryable: true,
      };
    }

    if (status >= 500) {
      return {
        code: 'NETWORK_ERROR',
        message: 'OpenAI API server error',
        retryable: true,
      };
    }

    try {
      const errorData = await response.json();
      return {
        code: 'NETWORK_ERROR',
        message: errorData.error?.message || 'Unknown OpenAI API error',
        retryable: false,
      };
    } catch {
      return {
        code: 'NETWORK_ERROR',
        message: `OpenAI API error: ${status}`,
        retryable: false,
      };
    }
  }

  /**
   * Get cost profile for a specific model.
   */
  getCost(model: string): { inputCostPer1kTokens: number; outputCostPer1kTokens: number } {
    const costs: Record<string, { inputCostPer1kTokens: number; outputCostPer1kTokens: number }> = {
      'gpt-4': { inputCostPer1kTokens: 0.03, outputCostPer1kTokens: 0.06 },
      'gpt-4o': { inputCostPer1kTokens: 0.0025, outputCostPer1kTokens: 0.01 },
      'o1-preview': { inputCostPer1kTokens: 0.015, outputCostPer1kTokens: 0.06 },
    };
    return costs[model] || costs['gpt-4o'];
  }

  /**
   * Get average latency estimate.
   */
  getLatency(): number {
    return 1200; // Average 1.2s based on typical GPT-4o performance
  }
}
