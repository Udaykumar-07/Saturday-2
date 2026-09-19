/**
 * Structured Developer Logger for Qwen local model execution.
 * Formats diagnostic lifecycle and inference logs without exposing
 * private credentials or secrets.
 */

export interface QwenRequestLog {
  requestId: string;
  task: string;
  modelId: string;
  inputLength: number;
  timestamp: number;
}

export interface QwenInferenceEndLog {
  requestId: string;
  latencyMs: number;
  tokenCount: number;
  success: boolean;
}

export interface QwenResponseLog {
  requestId: string;
  text: string;
  success: boolean;
}

export interface QwenInitFailureLog {
  model: string;
  tokenizer: string;
  runtime: string;
  error: string;
  stack?: string;
  timestamp: number;
}

export class QwenLogger {
  private static enabled = true;

  static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  static logRequest(log: QwenRequestLog): void {
    if (!this.enabled) return;
    const output = [
      'QWEN_REQUEST',
      '------------',
      `requestId: ${log.requestId}`,
      `task: ${log.task}`,
      `modelId: ${log.modelId}`,
      `inputLength: ${log.inputLength}`,
      `timestamp: ${log.timestamp}`,
    ].join('\n');
    console.log(output);
  }

  static logInferenceStart(requestId?: string): void {
    if (!this.enabled) return;
    const output = [
      'QWEN_INFERENCE_START',
      '--------------------',
      requestId ? `requestId: ${requestId}` : '',
    ].filter(Boolean).join('\n');
    console.log(output);
  }

  static logInferenceEnd(log: QwenInferenceEndLog): void {
    if (!this.enabled) return;
    const output = [
      'QWEN_INFERENCE_END',
      '------------------',
      `latency: ${log.latencyMs}ms`,
      `tokenCount: ${log.tokenCount}`,
      `success: ${log.success}`,
    ].join('\n');
    console.log(output);
  }

  static logResponse(log: QwenResponseLog): void {
    if (!this.enabled) return;
    const sanitizedText = log.text.length > 200 ? log.text.slice(0, 197) + '...' : log.text;
    const output = [
      'QWEN_RESPONSE',
      '-------------',
      `text: ${sanitizedText}`,
      `success: ${log.success}`,
    ].join('\n');
    console.log(output);
  }

  static logInitSuccess(modelId: string, durationMs: number): void {
    if (!this.enabled) return;
    console.log(`[QWEN_INIT_SUCCESS] model: ${modelId} initialized in ${durationMs}ms (READY)`);
  }

  static logInitFailed(log: QwenInitFailureLog): void {
    const output = [
      'QWEN_INIT_FAILED',
      '----------------',
      `model: ${log.model}`,
      `tokenizer: ${log.tokenizer}`,
      `runtime: ${log.runtime}`,
      `error: ${log.error}`,
      `stack: ${log.stack || 'none'}`,
      `timestamp: ${log.timestamp}`,
    ].join('\n');
    console.error(output);
  }
}
