/**
 * Qwen Local AI Provider.
 * Implements the standard AIProvider contract for local on-device execution.
 * Backed by QwenModelRuntime and QwenTokenizer with deterministic lifecycle management.
 */

import {
  AIProvider,
  AIRequest,
  AIResponse,
  IntelligenceCapability,
} from '../../types/ai';
import { AIProviderError } from '../../types/errors';
import { QwenModelRuntime } from './QwenModelRuntime';
import { QwenStatus } from './QwenTypes';
import { QwenContextBuilder } from './QwenContextBuilder';
import { ProviderHealthTracker } from '../../external/health/ProviderHealthTracker';

export class QwenProvider implements AIProvider {
  readonly id = 'qwen-local';
  readonly name = 'Qwen 2.5 0.5B Local';
  readonly type = 'local_model' as const;

  private runtime: QwenModelRuntime;
  private healthTracker?: ProviderHealthTracker;

  constructor(
    runtime?: QwenModelRuntime,
    healthTracker?: ProviderHealthTracker
  ) {
    this.runtime = runtime || new QwenModelRuntime();
    this.healthTracker = healthTracker;
  }

  /**
   * Initialize Qwen runtime.
   */
  async initialize(): Promise<void> {
    const start = Date.now();
    try {
      await this.runtime.initialize();
      this.healthTracker?.recordSuccess(this.id, Date.now() - start);
    } catch (err: any) {
      this.healthTracker?.recordFailure(this.id, Date.now() - start);
      throw err;
    }
  }

  /**
   * Check if Qwen local model is ready for inference.
   */
  async isAvailable(): Promise<boolean> {
    return this.runtime.getState() === 'READY';
  }

  /**
   * Get detailed runtime status and performance diagnostics.
   */
  getStatus(): QwenStatus {
    return this.runtime.getStatus();
  }

  /**
   * Get the underlying Qwen runtime instance.
   */
  getRuntime(): QwenModelRuntime {
    return this.runtime;
  }

  /**
   * Return supported capabilities.
   */
  getCapabilities(): IntelligenceCapability[] {
    return [
      { id: 'text_generation', category: 'generation', score: 0.85 },
      { id: 'reasoning', category: 'reasoning', score: 0.8 },
      { id: 'summarization', category: 'generation', score: 0.8 },
      { id: 'private_data_processing', category: 'privacy', score: 1.0 },
      { id: 'conversation', category: 'interaction', score: 0.9 },
    ];
  }

  /**
   * Generate AI response using local Qwen inference.
   */
  async generate(request: AIRequest): Promise<AIResponse> {
    const available = await this.isAvailable();
    if (!available) {
      const status = this.getStatus();
      const failReason = status.lastError?.message || `Current state: ${status.state}`;
      throw new AIProviderError(
        `Qwen local model is unavailable (${failReason}).`,
        this.id,
        true
      );
    }

    const start = Date.now();
    try {
      const promptContext = QwenContextBuilder.buildPrompt(
        request.messages,
        request.context,
        this.runtime.displayName
      );

      const output = await this.runtime.infer(promptContext.fullPrompt, {
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });

      this.healthTracker?.recordSuccess(this.id, output.latencyMs);

      return {
        content: output.text,
        providerId: this.id,
        modelId: this.runtime.modelId,
        usage: {
          inputTokens: output.inputTokenCount,
          outputTokens: output.outputTokenCount,
        },
        metadata: {
          isLocal: true,
          latencyMs: output.latencyMs,
          timeToFirstTokenMs: output.timeToFirstTokenMs,
          tokensPerSec: output.tokensPerSec,
          runtime: 'qwen-on-device',
        },
      };
    } catch (err: any) {
      this.healthTracker?.recordFailure(this.id, Date.now() - start);
      throw new AIProviderError(
        `Qwen inference failed: ${err?.message || 'Unknown error'}`,
        this.id,
        true
      );
    }
  }
}
