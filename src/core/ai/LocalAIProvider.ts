/**
 * Local on-device AI provider.
 * Implements real local inference using the LocalInferenceEngine
 * (supporting both embedded offline reasoning and local server endpoints).
 */

import { AIProvider, AIRequest, AIResponse, IntelligenceCapability } from '../types/ai';
import { AIProviderError } from '../types/errors';
import {
  LocalAIModelRegistry,
  LocalModelInfo,
  DEFAULT_LOCAL_MODEL_ID,
} from './LocalAIModelRegistry';
import {
  InferenceMode,
  LocalInferenceEngine,
} from './LocalInferenceEngine';
import { QwenProvider, QwenStatus } from './qwen';

export interface LocalAIProviderConfig {
  enabled?: boolean;
  modelId?: string;
  mode?: InferenceMode;
  endpointUrl?: string;
}

export class LocalAIProvider implements AIProvider {
  readonly id = 'local';
  readonly name = 'Local AI Model';
  readonly type = 'local_model' as const;

  private enabled: boolean;
  private modelRegistry: LocalAIModelRegistry;
  private engine: LocalInferenceEngine;
  private qwenProvider: QwenProvider;

  constructor(config: LocalAIProviderConfig = {}) {
    this.enabled = config.enabled ?? false;
    this.modelRegistry = new LocalAIModelRegistry();

    // Use synchronous getters for initialization (will use cached data)
    const selectedModel = config.modelId
      ? this.modelRegistry.getSync(config.modelId) || this.modelRegistry.getDefaultSync()
      : this.modelRegistry.getDefaultSync();

    this.engine = new LocalInferenceEngine({
      model: selectedModel,
      mode: config.mode || 'auto',
      endpointUrl: config.endpointUrl || 'http://10.0.2.2:11434',
    });

    this.qwenProvider = new QwenProvider(this.engine.getQwenRuntime());
  }

  getQwenProvider(): QwenProvider {
    return this.qwenProvider;
  }

  getQwenStatus(): QwenStatus {
    return this.qwenProvider.getStatus();
  }

  async initializeQwen(): Promise<void> {
    await this.qwenProvider.initialize();
  }

  /**
   * Check if the local AI provider is available.
   */
  async isAvailable(): Promise<boolean> {
    return this.enabled;
  }

  /**
   * Enable or disable this provider.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Set the active local model by ID.
   */
  async setModel(modelId: string): Promise<boolean> {
    const model = await this.modelRegistry.get(modelId);
    if (!model) return false;
    this.engine.setModel(model);
    return true;
  }

  /**
   * Get the active local model info.
   */
  getActiveModel(): LocalModelInfo {
    return this.engine.getActiveModel();
  }

  /**
   * Get all registered local models (only downloaded ones).
   */
  async getAllModels(): Promise<LocalModelInfo[]> {
    return await this.modelRegistry.getAll();
  }

  /**
   * Set the inference mode.
   */
  setMode(mode: InferenceMode): void {
    this.engine.setMode(mode);
  }

  /**
   * Get the current inference mode.
   */
  getMode(): InferenceMode {
    return this.engine.getMode();
  }

  /**
   * Set the endpoint URL.
   */
  setEndpointUrl(url: string): void {
    this.engine.setEndpointUrl(url);
  }

  /**
   * Get the endpoint URL.
   */
  getEndpointUrl(): string {
    return this.engine.getEndpointUrl();
  }

  /**
   * Check connection to the local endpoint server.
   */
  async checkEndpointHealth(): Promise<{ reachable: boolean; models?: string[]; latencyMs?: number }> {
    return this.engine.checkEndpointHealth();
  }

  /**
   * Generate a response using the local model runtime.
   */
  async generate(request: AIRequest): Promise<AIResponse> {
    const available = await this.isAvailable();
    if (!available) {
      throw new AIProviderError(
        'Local AI model is not yet configured. Please set up an on-device model.',
        this.id,
        true
      );
    }

    try {
      const result = await this.engine.infer(request.messages, request.context);

      return {
        content: result.text,
        providerId: this.id,
        modelId: result.modelId,
        usage: {
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        },
        metadata: {
          isLocal: true,
          mode: result.modeUsed,
          durationMs: result.durationMs,
          modelName: this.engine.getActiveModel().name,
        },
      };
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : 'Local model inference failed.',
        this.id,
        true
      );
    }
  }

  /** Get capabilities of the local model. */
  getCapabilities(): IntelligenceCapability[] {
    return [
      { id: 'chat', category: 'conversation' },
      { id: 'offline', category: 'availability' },
      { id: 'privacy', category: 'security' },
      { id: 'phone_actions', category: 'execution' },
    ];
  }
}
