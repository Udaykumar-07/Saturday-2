/**
 * llama.cpp Inference Engine for GGUF models
 * 
 * This provides ACTUAL neural network inference using llama.cpp.
 * NO FALLBACKS, NO MOCKS - real model inference only.
 */

import { NativeModules, Platform } from 'react-native';

const { LlamaCppModule } = NativeModules;

export interface LlamaCppInferenceOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  stopSequences?: string[];
}

export interface LlamaCppInferenceResult {
  text: string;
  tokensGenerated: number;
  latencyMs: number;
  tokensPerSecond: number;
  finishReason: 'eos' | 'max_tokens' | 'stop_sequence';
}

export interface LlamaCppModelStatus {
  loaded: boolean;
  modelId?: string;
  modelPath?: string;
  loadTimeMs?: number;
  error?: string;
}

/**
 * llama.cpp Inference Engine
 * 
 * Throws errors if model not loaded or inference fails.
 * NO FALLBACKS - ensures actual model inference.
 */
export class LlamaCppInferenceEngine {
  private modelLoaded: boolean = false;
  private modelId: string | null = null;
  private modelPath: string | null = null;
  private loadTimeMs: number = 0;

  /**
   * Load GGUF model for inference
   * Throws error if loading fails
   */
  async loadModel(modelPath: string, modelId: string): Promise<LlamaCppModelStatus> {
    const startTime = Date.now();

    if (!modelPath) {
      throw new Error('Model path is required');
    }

    if (Platform.OS === 'web') {
      throw new Error('llama.cpp inference not supported on web platform. Models must be downloaded to device.');
    }

    try {
      if (!LlamaCppModule) {
        throw new Error(
          'llama.cpp native module not available. Please ensure the app is built with native support.'
        );
      }

      // Initialize llama.cpp (no-op, but kept for consistency)
      console.log('Initializing llama.cpp...');
      await LlamaCppModule.initialize();

      console.log(`Loading GGUF model: ${modelId} from ${modelPath}`);
      await LlamaCppModule.loadModel(modelPath);

      this.modelLoaded = true;
      this.modelId = modelId;
      this.modelPath = modelPath;
      this.loadTimeMs = Date.now() - startTime;

      console.log(`✓ llama.cpp model loaded successfully in ${this.loadTimeMs}ms`);

      return {
        loaded: true,
        modelId,
        modelPath,
        loadTimeMs: this.loadTimeMs,
      };
    } catch (error) {
      this.modelLoaded = false;
      this.modelId = null;
      this.modelPath = null;

      const errorMessage = error instanceof Error ? error.message : 'Unknown error loading model';
      console.error('✗ Failed to load llama.cpp model:', errorMessage);

      throw new Error(`Failed to load GGUF model: ${errorMessage}`);
    }
  }

  /**
   * Unload the currently loaded model
   */
  async unloadModel(): Promise<void> {
    if (!this.modelLoaded) {
      return;
    }

    try {
      if (LlamaCppModule && Platform.OS !== 'web') {
        await LlamaCppModule.unloadModel();
      }

      console.log('✓ llama.cpp model unloaded');
    } catch (error) {
      console.error('Error unloading llama.cpp model:', error);
    }

    this.modelLoaded = false;
    this.modelId = null;
    this.modelPath = null;
    this.loadTimeMs = 0;
  }

  /**
   * Run inference on input text
   * Throws error if model not loaded or inference fails
   * NO FALLBACKS - actual inference only
   */
  async infer(prompt: string, options: LlamaCppInferenceOptions = {}): Promise<LlamaCppInferenceResult> {
    if (!this.modelLoaded) {
      throw new Error(
        'llama.cpp model is not loaded. Please download and load a model first. ' +
        'Go to Settings > Model Management to download a model.'
      );
    }

    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    const startTime = Date.now();

    const inferenceOptions = {
      maxTokens: options.maxTokens || 512,
      temperature: options.temperature || 0.7,
      topP: options.topP || 0.9,
      topK: options.topK || 40,
      repeatPenalty: options.repeatPenalty || 1.1,
      stopSequences: options.stopSequences || ['</s>', '<|im_end|>', '<|endoftext|>'],
    };

    try {
      if (!LlamaCppModule || Platform.OS === 'web') {
        throw new Error('llama.cpp native module not available');
      }

      console.log(`Running llama.cpp inference on prompt: "${prompt.substring(0, 50)}..."`);

      const result = await LlamaCppModule.infer(
        prompt,
        inferenceOptions.maxTokens,
        inferenceOptions.temperature,
        inferenceOptions.topK,
        inferenceOptions.topP
      );

      const latencyMs = Date.now() - startTime;
      const tokensPerSecond = parseFloat((result.tokensGenerated / (latencyMs / 1000)).toFixed(1));

      console.log(`✓ llama.cpp inference completed in ${latencyMs}ms (${tokensPerSecond} tok/s)`);

      return {
        text: result.text,
        tokensGenerated: result.tokensGenerated,
        latencyMs,
        tokensPerSecond,
        finishReason: result.finishReason || 'eos',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown inference error';
      console.error('✗ llama.cpp inference failed:', errorMessage);

      throw new Error(`llama.cpp inference failed: ${errorMessage}`);
    }
  }

  /**
   * Get current model status
   */
  getStatus(): LlamaCppModelStatus {
    return {
      loaded: this.modelLoaded,
      modelId: this.modelId || undefined,
      modelPath: this.modelPath || undefined,
      loadTimeMs: this.modelLoaded ? this.loadTimeMs : undefined,
    };
  }

  /**
   * Check if engine is ready for inference
   */
  isReady(): boolean {
    return this.modelLoaded;
  }

  /**
   * Get loaded model ID
   */
  getModelId(): string | null {
    return this.modelId;
  }

  /**
   * Get loaded model path
   */
  getModelPath(): string | null {
    return this.modelPath;
  }
}
