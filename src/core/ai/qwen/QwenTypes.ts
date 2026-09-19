/**
 * Qwen Local Model Types & Interfaces.
 * Defines deterministic lifecycle states, status schemas, tokenizer interfaces,
 * and inference options for on-device Qwen execution.
 */

export type QwenProviderState =
  | 'UNINITIALIZED'
  | 'LOADING'
  | 'READY'
  | 'FAILED'
  | 'DEGRADED';

export interface QwenErrorDetails {
  code: string;
  message: string;
  timestamp: number;
  modelId: string;
  runtime?: string;
  stack?: string;
}

export interface QwenDiagnostics {
  totalInferences: number;
  successfulInferences: number;
  failedInferences: number;
  averageLatencyMs: number;
  averageTokensPerSec: number;
  timeToFirstTokenMs: number;
  lastInferenceLatencyMs?: number;
}

export interface QwenStatus {
  state: QwenProviderState;
  modelId: string;
  displayName: string;
  loaded: boolean;
  loadTimeMs: number;
  ramUsageMB: number;
  diskSizeMB: number;
  contextWindow: number;
  quantization: string;
  deviceTier: 'mobile_edge';
  lastError?: QwenErrorDetails;
  diagnostics: QwenDiagnostics;
}

export interface QwenInferenceOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  requestId?: string;
}

export interface QwenInferenceOutput {
  text: string;
  inputTokenCount: number;
  outputTokenCount: number;
  latencyMs: number;
  timeToFirstTokenMs: number;
  tokensPerSec: number;
  finishReason: 'stop' | 'length' | 'eos';
}

export interface QwenToken {
  id: number;
  piece: string;
}
