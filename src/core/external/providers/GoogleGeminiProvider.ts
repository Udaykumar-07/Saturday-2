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
    const maxRetries = 2;
    const fallbackModels = ['gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-3.6-flash'];
    
    try {
      const config = await this.credentialStore.retrieve<ProviderConfig>(SERVICE_ID);
      if (!config || !config.apiKey) {
        console.error('❌ [Gemini] No API key configured');
        return {
          taskId: request.taskId,
          status: 'requires_authentication',
          providerId: this.id,
          error: 'Google Gemini API key not configured',
        };
      }

      console.log('🔑 [Gemini] API key found (length:', config.apiKey.length, ')');
      
      // Use model from config, or default to gemini-1.5-flash-latest for v1beta API
      const primaryModel = config.model || 'gemini-1.5-flash-latest';
      const modelsToTry = [primaryModel, ...fallbackModels.filter(m => m !== primaryModel)];
      
      console.log('🤖 [Gemini] Using model:', primaryModel);
      console.log('📝 [Gemini] Input length:', String(request.input).length, 'chars');
      
      let lastError: Error | null = null;
      
      // Try primary model with retries, then fallback models
      for (let modelIndex = 0; modelIndex < modelsToTry.length; modelIndex++) {
        const model = modelsToTry[modelIndex];
        const isRetry = modelIndex > 0;
        
        if (isRetry) {
          console.log(`🔄 [Gemini] Trying fallback model: ${model}`);
        }
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            if (attempt > 0) {
              const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
              console.log(`⏳ [Gemini] Retry ${attempt}/${maxRetries} after ${delay}ms delay...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            let result = '';
            for await (const chunk of this.generateStream(String(request.input), model)) {
              result += chunk.text;
            }

            console.log('✅ [Gemini] Generated response length:', result.length, 'chars');
            
            this.recordSuccess(Date.now() - startTime);
            return {
              taskId: request.taskId,
              status: 'completed',
              result,
              providerId: this.id,
            };
          } catch (error) {
            lastError = error as Error;
            
            // If it's a 503 (high demand) or 429 (rate limit), retry
            if (error instanceof ProviderRateLimitError || 
                (error instanceof ExternalProviderError && error.message.includes('503'))) {
              console.log(`⚠️ [Gemini] ${error.message}, will retry...`);
              continue; // Try again
            }
            
            // For other errors, don't retry this model
            console.error(`❌ [Gemini] Non-retryable error with ${model}:`, error);
            break;
          }
        }
        
        // If we've tried all retries for this model, try next model
        if (modelIndex < modelsToTry.length - 1) {
          console.log(`⚠️ [Gemini] Max retries reached for ${model}, trying next model...`);
        }
      }
      
      // All models and retries failed
      console.error('❌ [Gemini] All models and retries exhausted');
      if (lastError) {
        console.error('❌ [Gemini] Execute error:', lastError);
        if (lastError instanceof Error) {
          console.error('❌ [Gemini] Error details:', {
            name: lastError.name,
            message: lastError.message,
            stack: lastError.stack?.substring(0, 200)
          });
        }
      }
      
      this.recordFailure();
      // Re-throw specific provider errors so they can be handled upstream
      if (
        lastError instanceof ProviderRateLimitError ||
        lastError instanceof ProviderInvalidKeyError ||
        lastError instanceof ProviderNetworkError
      ) {
        throw lastError;
      }
      return {
        taskId: request.taskId,
        status: 'failed',
        providerId: this.id,
        error: lastError instanceof Error ? lastError.message : String(lastError),
      };
    } catch (error) {
      console.error('❌ [Gemini] Execute error:', error);
      if (error instanceof Error) {
        console.error('❌ [Gemini] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 200)
        });
      }
      
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
      console.log('🌐 [Gemini] API URL:', url.replace(config.apiKey, 'API_KEY_HIDDEN'));
      console.log('📤 [Gemini] Sending request...');
      
      const requestBody = {
        contents: [{
          parts: [{ text: input }],
        }],
      };
      console.log('📦 [Gemini] Request body:', JSON.stringify(requestBody).substring(0, 200));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: this.abortController.signal,
      });

      console.log('📥 [Gemini] Response status:', response.status, response.statusText);

      if (!response.ok) {
        // Try to get error details
        let errorDetails = '';
        try {
          const errorBody = await response.text();
          console.error('❌ [Gemini] Error response body:', errorBody.substring(0, 500));
          errorDetails = errorBody;
        } catch (e) {
          console.error('❌ [Gemini] Could not read error body');
        }
        
        // Throw specific error types based on HTTP status
        if (response.status === 429) {
          throw new ProviderRateLimitError(this.id);
        }
        if (response.status === 401 || response.status === 403) {
          throw new ProviderInvalidKeyError(this.id);
        }
        if (response.status === 503) {
          // High demand / service unavailable - should be retried
          throw new ExternalProviderError('Google Gemini API server error (503 - high demand)', this.id, true);
        }
        const error = await this.mapError(response);
        throw new ExternalProviderError(error.message, this.id, error.retryable);
      }

      // React Native fetch doesn't support response.body.getReader() streaming
      // We'll use response.text() and parse the response
      console.log('📖 [Gemini] Reading response text...');
      const responseText = await response.text();
      console.log('📝 [Gemini] Response text length:', responseText.length);
      
      if (!responseText) {
        throw new ExternalProviderError('Empty response body', this.id);
      }

      // Try to parse as JSON array first (non-streaming response)
      try {
        const jsonArray = JSON.parse(responseText);
        if (Array.isArray(jsonArray)) {
          console.log('📋 [Gemini] Parsed as JSON array with', jsonArray.length, 'items');
          for (const item of jsonArray) {
            const text = item.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              console.log('✅ [Gemini] Extracted text chunk:', text.substring(0, 50));
              yield { text, done: false };
            }
          }
          yield { text: '', done: true };
          return;
        }
      } catch (e) {
        // Not a JSON array, try newline-delimited JSON
        console.log('📋 [Gemini] Not a JSON array, trying newline-delimited JSON');
      }

      // Process as newline-delimited JSON (streaming response)
      const lines = responseText.split('\n').filter(line => line.trim());
      console.log('📋 [Gemini] Response lines:', lines.length);

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            console.log('✅ [Gemini] Extracted text chunk:', text.substring(0, 50));
            yield { text, done: false };
          }
        } catch (parseError) {
          // Skip lines that aren't valid JSON (whitespace, commas, brackets)
          const trimmed = line.trim();
          if (trimmed && trimmed !== '[' && trimmed !== ']' && trimmed !== ',' && trimmed !== '{' && trimmed !== '}') {
            console.log('⚠️ [Gemini] Skipping non-JSON line:', trimmed.substring(0, 50));
          }
        }
      }

      yield { text: '', done: true };
    } catch (error) {
      console.error('❌ [Gemini] generateStream error:', error);
      
      if ((error as Error).name === 'AbortError') {
        throw new ExternalProviderError('Request cancelled', this.id, false);
      }
      // Handle network errors (no response at all)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('❌ [Gemini] Network/fetch error detected');
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
   * Fetch list of available models for the given API key.
   * Returns array of model objects with name, displayName, and description.
   */
  async listAvailableModels(apiKey: string): Promise<Array<{
    name: string;
    displayName: string;
    description: string;
    supportedMethods: string[];
  }>> {
    try {
      console.log('📋 [Gemini] Fetching available models...');
      const response = await fetch(`${GEMINI_API_BASE}/models?key=${apiKey}`, {
        method: 'GET',
      });

      if (!response.ok) {
        console.error('❌ [Gemini] Failed to fetch models:', response.status);
        return [];
      }

      const data = await response.json();
      console.log('✅ [Gemini] Models response:', JSON.stringify(data).substring(0, 200));

      if (!data.models || !Array.isArray(data.models)) {
        console.error('❌ [Gemini] Invalid response format');
        return [];
      }

      // Filter models that support generateContent (text generation)
      const textModels = data.models
        .filter((model: any) => 
          model.supportedGenerationMethods?.includes('generateContent') ||
          model.supportedGenerationMethods?.includes('streamGenerateContent')
        )
        .map((model: any) => {
          const technicalName = model.name.replace('models/', '');
          return {
            name: technicalName,
            displayName: model.displayName || model.name,
            description: model.description || '',
            supportedMethods: model.supportedGenerationMethods || [],
          };
        });

      // Deduplicate models with same display name by appending technical name
      const seen = new Map<string, number>();
      const deduplicatedModels = textModels.map((model: any) => {
        const count = seen.get(model.displayName) || 0;
        seen.set(model.displayName, count + 1);
        
        // If display name appears multiple times, append technical name for uniqueness
        if (count > 0) {
          return {
            ...model,
            displayName: `${model.displayName} (${model.name})`,
          };
        }
        return model;
      });

      console.log(`✅ [Gemini] Found ${deduplicatedModels.length} text generation models`);
      deduplicatedModels.forEach((m: any) => console.log(`   - ${m.name}: ${m.displayName}`));

      return deduplicatedModels;
    } catch (error) {
      console.error('❌ [Gemini] Error fetching models:', error);
      return [];
    }
  }

  /**
   * Store API key and model configuration securely.
   */
  async setApiKey(apiKey: string, model: string = 'gemini-1.5-flash-latest'): Promise<void> {
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
      'gemini-1.5-pro-latest': { inputCostPer1kTokens: 0.00125, outputCostPer1kTokens: 0.005 },
      'gemini-1.5-flash': { inputCostPer1kTokens: 0.000075, outputCostPer1kTokens: 0.0003 },
      'gemini-1.5-flash-latest': { inputCostPer1kTokens: 0.000075, outputCostPer1kTokens: 0.0003 },
      'gemini-pro': { inputCostPer1kTokens: 0.0005, outputCostPer1kTokens: 0.0015 },
    };
    return costs[model] || costs['gemini-1.5-flash-latest'];
  }

  /**
   * Get average latency estimate.
   */
  getLatency(): number {
    return 1300; // Average 1.3s based on typical Gemini performance
  }
}
