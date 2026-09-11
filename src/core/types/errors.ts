/**
 * Error types for Saturday.
 * Every error is explicit — Saturday never silently fails.
 */

export class SaturdayError extends Error {
  public readonly code: string;
  public readonly recoverable: boolean;

  constructor(message: string, code: string, recoverable = false) {
    super(message);
    this.name = 'SaturdayError';
    this.code = code;
    this.recoverable = recoverable;
  }
}

export class AIProviderError extends SaturdayError {
  public readonly providerId?: string;

  constructor(message: string, providerId?: string, recoverable = false) {
    super(message, 'AI_PROVIDER_ERROR', recoverable);
    this.name = 'AIProviderError';
    this.providerId = providerId;
  }
}

export class AIProviderUnavailableError extends SaturdayError {
  constructor(message = 'No AI provider is currently available.') {
    super(message, 'AI_PROVIDER_UNAVAILABLE', true);
    this.name = 'AIProviderUnavailableError';
  }
}

export class ModelUnavailableError extends SaturdayError {
  constructor(modelId: string) {
    super(`Model "${modelId}" is not available.`, 'MODEL_UNAVAILABLE', true);
    this.name = 'ModelUnavailableError';
  }
}

export class StorageError extends SaturdayError {
  constructor(message: string, recoverable = false) {
    super(message, 'STORAGE_ERROR', recoverable);
    this.name = 'StorageError';
  }
}

export class RoutingError extends SaturdayError {
  constructor(message: string) {
    super(message, 'ROUTING_ERROR', true);
    this.name = 'RoutingError';
  }
}

export class MalformedResponseError extends SaturdayError {
  constructor(message = 'Received a malformed response from the AI provider.') {
    super(message, 'MALFORMED_RESPONSE', true);
    this.name = 'MalformedResponseError';
  }
}

export class TimeoutError extends SaturdayError {
  constructor(message = 'The request timed out.') {
    super(message, 'TIMEOUT', true);
    this.name = 'TimeoutError';
  }
}
