/**
 * Shared types for external AI provider adapters.
 * 
 * Defines common interfaces for streaming responses, error handling,
 * configuration, and token usage tracking across all cloud AI providers.
 */

/**
 * A single chunk from a streaming response.
 */
export interface StreamChunk {
  /** Incremental text content */
  text: string;
  /** Whether this is the final chunk */
  done: boolean;
}

/**
 * Standardized error from an AI provider.
 */
export interface ProviderError {
  /** Error code: INVALID_KEY, RATE_LIMIT, NETWORK_ERROR, TIMEOUT, etc. */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Whether the request can be retried */
  retryable: boolean;
}

/**
 * Configuration for a provider (API key, model selection, etc.).
 */
export interface ProviderConfig {
  /** API key for authentication */
  apiKey: string;
  /** Model identifier (e.g., "gpt-4o", "claude-3-5-sonnet-20241022") */
  model: string;
}

/**
 * Token usage statistics for a completed request.
 */
export interface TokenUsage {
  /** Number of input tokens consumed */
  inputTokens: number;
  /** Number of output tokens generated */
  outputTokens: number;
}

/**
 * Generic AI provider adapter interface for external cloud models.
 */
export interface AIProviderAdapter {
  /**
   * Generate a streaming response for the given input.
   * @param input - Text input to send to the model
   * @param model - Model identifier to use
   * @returns AsyncGenerator yielding StreamChunk objects
   */
  generateStream(input: string, model: string): AsyncGenerator<StreamChunk>;

  /**
   * Validate an API key by making a test request.
   * @param key - API key to validate
   * @returns Promise resolving to true if valid, false otherwise
   */
  validateApiKey(key: string): Promise<boolean>;

  /**
   * Get the estimated cost per 1k tokens for this provider.
   * @param model - Model identifier
   * @returns Object with input and output costs per 1k tokens
   */
  getCost(model: string): { inputCostPer1kTokens: number; outputCostPer1kTokens: number };

  /**
   * Get the estimated latency for this provider.
   * @returns Average latency in milliseconds
   */
  getLatency(): number;
}
