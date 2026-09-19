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

// --- Action Engine Errors (Phase 2) ---

export class ActionValidationError extends SaturdayError {
  constructor(message: string) {
    super(message, 'ACTION_VALIDATION_ERROR', true);
    this.name = 'ActionValidationError';
  }
}

export class ActionExecutionError extends SaturdayError {
  constructor(message: string, recoverable = true) {
    super(message, 'ACTION_EXECUTION_ERROR', recoverable);
    this.name = 'ActionExecutionError';
  }
}

export class ActionPermissionError extends SaturdayError {
  constructor(message = 'Permission denied for this action.') {
    super(message, 'ACTION_PERMISSION_DENIED', true);
    this.name = 'ActionPermissionError';
  }
}

export class CapabilityUnavailableError extends SaturdayError {
  constructor(capabilityId: string) {
    super(
      `Capability "${capabilityId}" is not available on this device.`,
      'CAPABILITY_UNAVAILABLE',
      true
    );
    this.name = 'CapabilityUnavailableError';
  }
}

// --- External Intelligence & Auth Errors (Phase 3) ---

export class AuthenticationRequiredError extends SaturdayError {
  readonly serviceId: string;

  constructor(serviceId: string, message?: string) {
    super(
      message || `Authentication required for service "${serviceId}".`,
      'AUTHENTICATION_REQUIRED',
      true
    );
    this.name = 'AuthenticationRequiredError';
    this.serviceId = serviceId;
  }
}

export class AuthenticationExpiredError extends SaturdayError {
  readonly serviceId: string;

  constructor(serviceId: string, message?: string) {
    super(
      message || `Authentication session expired for service "${serviceId}".`,
      'AUTHENTICATION_EXPIRED',
      true
    );
    this.name = 'AuthenticationExpiredError';
    this.serviceId = serviceId;
  }
}

export class DataBoundaryError extends SaturdayError {
  readonly reason: string;

  constructor(reason: string) {
    super(
      `Data boundary restriction: ${reason}`,
      'DATA_BOUNDARY_VIOLATION',
      true
    );
    this.name = 'DataBoundaryError';
    this.reason = reason;
  }
}

export class ExternalProviderError extends SaturdayError {
  readonly providerId?: string;

  constructor(message: string, providerId?: string, recoverable = true) {
    super(message, 'EXTERNAL_PROVIDER_ERROR', recoverable);
    this.name = 'ExternalProviderError';
    this.providerId = providerId;
  }
}

export class AgentCommunicationError extends SaturdayError {
  readonly agentId?: string;

  constructor(message: string, agentId?: string, recoverable = true) {
    super(message, 'AGENT_COMMUNICATION_ERROR', recoverable);
    this.name = 'AgentCommunicationError';
    this.agentId = agentId;
  }
}

