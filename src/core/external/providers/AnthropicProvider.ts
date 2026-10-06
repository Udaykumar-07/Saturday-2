/**
 * Anthropic Claude Provider Adapter.
 * 
 * Provides integration with Anthropic's Claude API including Claude 3.5 Sonnet and Opus.
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

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';
const SERVICE_ID = 'anthropic_provider';

export class AnthropicProvider extends BaseExternalProvider {
  readonly id = SERVICE_ID;
  readonly name = 'Anthropic Claude';
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
      'LONG_CONTEXT',
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
          error: 'Anthropic API key not configured',
        };
      }

      const model = config.model || 'claude-3-5-sonnet-20241022';
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
   * Generate streaming response from Anthropic API.
   */
  async *generateStream(input: string, model: string): AsyncGenerator<StreamChunk> {
    const config = await this.credentialStore.retrieve<ProviderConfig>(SERVICE_ID);
    if (!config || !config.apiKey) {
      throw new ExternalProviderError('Anthropic API key not configured', this.id);
    }

    this.abortController = new AbortController();

    try {
      const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: input }],
          max_tokens: 4096,
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
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            
            if (json.type === 'content_block_delta' && json.delta?.text) {
              yield { text: json.delta.text, done: false };
            } else if (json.type === 'message_stop') {
              yield { text: '', done: true };
              return;
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
   * Validate API key by making a test request.
   */
  async validateApiKey(key: string): Promise<boolean> {
    try {
      const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });
      // 200-299 or 400 (bad request but valid auth) means key is valid
      return response.ok || response.status === 400;
    } catch {
      return false;
    }
  }

  /**
   * Store API key and model configuration securely.
   */
  async setApiKey(apiKey: string, model: string = 'claude-3-5-sonnet-20241022'): Promise<void> {
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
        message: 'Invalid Anthropic API key',
        retryable: false,
      };
    }

    if (status === 429) {
      return {
        code: 'RATE_LIMIT',
        message: 'Anthropic API rate limit exceeded',
        retryable: true,
      };
    }

    if (status >= 500) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Anthropic API server error',
        retryable: true,
      };
    }

    try {
      const errorData = await response.json();
      return {
        code: 'NETWORK_ERROR',
        message: errorData.error?.message || 'Unknown Anthropic API error',
        retryable: false,
      };
    } catch {
      return {
        code: 'NETWORK_ERROR',
        message: `Anthropic API error: ${status}`,
        retryable: false,
      };
    }
  }

  /**
   * Get cost profile for a specific model.
   */
  getCost(model: string): { inputCostPer1kTokens: number; outputCostPer1kTokens: number } {
    const costs: Record<string, { inputCostPer1kTokens: number; outputCostPer1kTokens: number }> = {
      'claude-3-5-sonnet-20241022': { inputCostPer1kTokens: 0.003, outputCostPer1kTokens: 0.015 },
      'claude-3-opus-20240229': { inputCostPer1kTokens: 0.015, outputCostPer1kTokens: 0.075 },
    };
    return costs[model] || costs['claude-3-5-sonnet-20241022'];
  }

  /**
   * Get average latency estimate.
   */
  getLatency(): number {
    return 1400; // Average 1.4s based on typical Claude performance
  }
}
