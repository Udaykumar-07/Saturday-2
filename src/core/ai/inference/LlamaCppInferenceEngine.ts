/**
 * llama.cpp Inference Engine for GGUF models
 * 
 * This provides ACTUAL neural network inference using llama.cpp via llama.rn v0.9.x.
 * NO FALLBACKS, NO MOCKS - real model inference only.
 */

import { Platform } from 'react-native';
import { initLlama } from 'llama.rn';

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
  private context: any = null; // LlamaContext from llama.rn

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
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 LOADING MODEL: ${modelId}`);
      console.log(`📂 Path: ${modelPath}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      // Create context with the model using llama.rn v0.9.x API
      // Use file:// prefix for local files
      const modelUri = modelPath.startsWith('file://') ? modelPath : `file://${modelPath}`;
      
      this.context = await initLlama({
        model: modelUri,
        use_mlock: true,
        n_ctx: 4096, // Increased context for Gemma (was 2048)
        n_gpu_layers: 32, // GPU acceleration - offload layers to GPU for faster inference
      });

      this.modelLoaded = true;
      this.modelId = modelId;
      this.modelPath = modelPath;
      this.loadTimeMs = Date.now() - startTime;

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`✅ MODEL LOADED: ${modelId}`);
      console.log(`⏱️  Load time: ${this.loadTimeMs}ms`);
      console.log(`🎯 GPU layers: 32 (acceleration enabled)`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

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
      this.context = null;

      const errorMessage = error instanceof Error ? error.message : 'Unknown error loading model';
      console.error('✗ Failed to load llama.rn model:', errorMessage);

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
      if (this.context && Platform.OS !== 'web') {
        await this.context.release();
      }

      console.log('✓ llama.rn model unloaded');
    } catch (error) {
      console.error('Error unloading llama.rn model:', error);
    }

    this.modelLoaded = false;
    this.modelId = null;
    this.modelPath = null;
    this.loadTimeMs = 0;
    this.context = null;
  }

  /**
   * Run inference on input text
   * Throws error if model not loaded or inference fails
   * NO FALLBACKS - actual inference only
   */
  async infer(prompt: string, options: LlamaCppInferenceOptions = {}): Promise<LlamaCppInferenceResult> {
    if (!this.modelLoaded || !this.context) {
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
      if (Platform.OS === 'web') {
        throw new Error('llama.rn not available on web platform');
      }

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🤖 INFERENCE START`);
      console.log(`📝 Model: ${this.modelId}`);
      console.log(`📄 Prompt (first 100 chars): "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
      console.log(`⚙️  Temperature: ${inferenceOptions.temperature}, TopP: ${inferenceOptions.topP}, MaxTokens: ${inferenceOptions.maxTokens}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Run completion with llama.rn v0.9.x API
      const completionResult = await this.context.completion(
        {
          prompt,
          n_predict: inferenceOptions.maxTokens,
          temperature: inferenceOptions.temperature,
          top_p: inferenceOptions.topP,
          top_k: inferenceOptions.topK,
          repeat_penalty: inferenceOptions.repeatPenalty,
          stop: inferenceOptions.stopSequences,
        },
        (data: any) => {
          // Progress callback - could be used for streaming in the future
          // console.log('Token:', data.token);
        }
      );

      const latencyMs = Date.now() - startTime;
      const tokensGenerated = completionResult.timings?.predicted_n || 0;
      const tokensPerSecond = parseFloat((tokensGenerated / (latencyMs / 1000)).toFixed(1));

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`✅ INFERENCE COMPLETE`);
      console.log(`🤖 Model: ${this.modelId}`);
      console.log(`⏱️  Latency: ${latencyMs}ms`);
      console.log(`🎯 Tokens: ${tokensGenerated} tokens @ ${tokensPerSecond} tok/s`);
      console.log(`📊 Finish reason: ${completionResult.stopped_eos ? 'eos' : 'max_tokens'}`);
      console.log(`📝 Response (first 200 chars): "${completionResult.text.substring(0, 200)}${completionResult.text.length > 200 ? '...' : ''}"`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      return {
        text: completionResult.text,
        tokensGenerated,
        latencyMs,
        tokensPerSecond,
        finishReason: completionResult.stopped_eos ? 'eos' : 'max_tokens',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown inference error';
      console.error('✗ llama.rn inference failed:', errorMessage);

      throw new Error(`llama.rn inference failed: ${errorMessage}`);
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
