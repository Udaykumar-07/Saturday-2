/**
 * AI provider and intelligence types for Saturday.
 * These abstractions allow Saturday to work with any AI provider.
 */

import { Message } from './conversation';
import { AIContext } from './context';

export interface AIRequest {
  /** Messages to send to the AI provider */
  messages: Message[];
  /** Optional task type hint for routing */
  taskType?: string;
  /** Required capabilities for this request */
  capabilities?: string[];
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Sampling temperature (0-1) */
  temperature?: number;
  /** Contextual information for the request */
  context?: AIContext;
}

export interface AIResponse {
  /** Generated text content */
  content: string;
  /** ID of the provider that generated this response */
  providerId: string;
  /** Specific model used, if applicable */
  modelId?: string;
  /** Token usage statistics */
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  /** Additional provider-specific metadata */
  metadata?: Record<string, unknown>;
}

export interface AIProvider {
  /** Unique provider identifier */
  id: string;
  /** Human-readable provider name */
  name: string;
  /** Provider type classification */
  type: IntelligenceProviderType;

  /** Check if this provider is currently available */
  isAvailable(): Promise<boolean>;

  /** Generate a response for the given request */
  generate(request: AIRequest): Promise<AIResponse>;

  /** Get the capabilities this provider supports */
  getCapabilities(): IntelligenceCapability[];
}

export interface AIProviderConfig {
  /** Provider identifier */
  providerId: string;
  /** Provider-specific configuration */
  config: Record<string, unknown>;
}

export interface AIRoutingDecision {
  /** Selected provider ID */
  providerId: string;
  /** Human-readable reason for the decision */
  reason?: string;
  /** Confidence in the routing decision (0-1) */
  confidence: number;
}

// --- Intelligence Registry Types ---

export type IntelligenceProviderType =
  | 'local_model'
  | 'cloud_model'
  | 'agent'
  | 'api'
  | 'tool';

export interface IntelligenceCapability {
  /** Unique capability identifier */
  id: string;
  /** Category of capability */
  category: string;
  /** Optional quality score (0-1) */
  score?: number;
}

export interface IntelligenceProvider {
  /** Unique provider identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Type of intelligence source */
  type: IntelligenceProviderType;
  /** Capabilities this provider offers */
  capabilities: IntelligenceCapability[];
}
