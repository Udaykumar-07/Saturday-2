/**
 * Google Gemini Provider Adapter.
 * 
 * Provides integration with Google's Gemini API including Gemini 1.5 Pro and Flash.
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

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const SERVICE_ID = 'google_gemini_provider';

export class GoogleGeminiProvider extends BaseExternalProvider {
  readonly id = SERVICE_ID;
  readonly name = 'Google Gemini';
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
          error: 'Google Gemini API key not configured',
        };
      }

      const model = config.model || 'gemini-1.5-pro';
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
   * Generate streaming response from Google Gemini API.
   */
  async *generateStream(input: string, model: string): AsyncGenerator<StreamChunk> {
    const config = await this.credentialStore.retrieve<ProviderConfig>(SERVICE_ID);
    if (!config || !config.apiKey) {
      throw new ExternalProviderError('Google Gemini API key not configured', this.id);
    }

    this.abortController = new AbortController();

    try {
      const url = `${GEMINI_API_BASE}/models/${model}:streamGenerateContent?key=${config.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: input }],
          }],
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
          if (!trimmed) continue;

          try {
            const json = JSON.parse(trimmed);
            
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              yield { text, done: false };
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
   * Validate API key by listing available models.
   */
  async validateApiKey(key: string): Promise<boolean> {
    try {
      const response = await fetch(`${GEMINI_API_BASE}/models?key=${key}`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Store API key and model configuration securely.
   */
  async setApiKey(apiKey: string, model: string = 'gemini-1.5-pro'): Promise<void> {
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

    if (status === 401 || status === 403) {
      return {
        code: 'INVALID_KEY',
        message: 'Invalid Google Gemini API key',
        retryable: false,
      };
    }

    if (status === 429) {
      return {
        code: 'RATE_LIMIT',
        message: 'Google Gemini API rate limit exceeded',
        retryable: true,
      };
    }

    if (status >= 500) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Google Gemini API server error',
        retryable: true,
      };
    }

    try {
      const errorData = await response.json();
      return {
        code: 'NETWORK_ERROR',
        message: errorData.error?.message || 'Unknown Google Gemini API error',
        retryable: false,
      };
    } catch {
      return {
        code: 'NETWORK_ERROR',
        message: `Google Gemini API error: ${status}`,
        retryable: false,
      };
    }
  }

  /**
   * Get cost profile for a specific model.
   */
  getCost(model: string): { inputCostPer1kTokens: number; outputCostPer1kTokens: number } {
    const costs: Record<string, { inputCostPer1kTokens: number; outputCostPer1kTokens: number }> = {
      'gemini-1.5-pro': { inputCostPer1kTokens: 0.00125, outputCostPer1kTokens: 0.005 },
      'gemini-1.5-flash': { inputCostPer1kTokens: 0.000075, outputCostPer1kTokens: 0.0003 },
    };
    return costs[model] || costs['gemini-1.5-pro'];
  }

  /**
   * Get average latency estimate.
   */
  getLatency(): number {
    return 1300; // Average 1.3s based on typical Gemini performance
  }
}
