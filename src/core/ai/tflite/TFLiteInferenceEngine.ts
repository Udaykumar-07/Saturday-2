/**
 * TensorFlow Lite Inference Engine for Qwen 2.5
 * 
 * Provides actual neural network inference using TFLite/ONNX Runtime
 * or native Android ML Kit integration.
 * 
 * This replaces the pattern-matching simulator in QwenModelRuntime.
 */

import { NativeModules, Platform } from 'react-native';

const { QwenTFLiteModule } = NativeModules;

export interface TFLiteInferenceOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  stopSequences?: string[];
  stream?: boolean;
}

export interface TFLiteInferenceResult {
  text: string;
  tokensGenerated: number;
  latencyMs: number;
  tokensPerSecond: number;
  finishReason: 'eos' | 'max_tokens' | 'stop_sequence' | 'error';
}

export interface ModelLoadStatus {
  loaded: boolean;
  modelId?: string;
  loadTimeMs?: number;
  error?: string;
}

/**
 * TFLite Inference Engine
 * 
 * Interfaces with native Android/iOS module for actual ML inference
 */
export class TFLiteInferenceEngine {
  private modelId: string | null = null;
  private loaded: boolean = false;
  private loadTimeMs: number = 0;

  /**
   * Load a model for inference
   */
  async loadModel(modelPath: string, modelId: string): Promise<ModelLoadStatus> {
    const startTime = Date.now();

    try {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        if (!QwenTFLiteModule) {
          throw new Error('Native TFLite module not available');
        }

        // Call native module to load model
        const result = await QwenTFLiteModule.loadModel(modelPath);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to load model');
        }

        this.modelId = modelId;
        this.loaded = true;
        this.loadTimeMs = Date.now() - startTime;

        return {
          loaded: true,
          modelId,
          loadTimeMs: this.loadTimeMs,
        };
      } else {
        // Web/other platforms: use fallback
        return this.loadModelFallback(modelPath, modelId, startTime);
      }
    } catch (error) {
      this.loaded = false;
      return {
        loaded: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fallback model loading for non-native platforms
   * Throws error - NO FALLBACKS
   */
  private async loadModelFallback(
    modelPath: string,
    modelId: string,
    startTime: number
  ): Promise<ModelLoadStatus> {
    throw new Error(
      'Native ONNX module not available. This platform does not support local model inference. ' +
      'Please use an Android or iOS device with the native module installed.'
    );
  }

  /**
   * Unload the currently loaded model
   */
  async unloadModel(): Promise<void> {
    if (!this.loaded) {
      return;
    }

    try {
      if ((Platform.OS === 'android' || Platform.OS === 'ios') && QwenTFLiteModule) {
        await QwenTFLiteModule.unloadModel();
      }
    } catch (error) {
      console.error('Error unloading model:', error);
    }

    this.loaded = false;
    this.modelId = null;
    this.loadTimeMs = 0;
  }

  /**
   * Run inference on input text
   * NO FALLBACKS - throws error if native module unavailable
   */
  async infer(
    prompt: string,
    options: TFLiteInferenceOptions = {}
  ): Promise<TFLiteInferenceResult> {
    if (!this.loaded) {
      throw new Error('Model is not loaded. Please download a model from Settings first.');
    }

    const startTime = Date.now();

    const inferenceOptions = {
      maxTokens: options.maxTokens || 512,
      temperature: options.temperature || 0.7,
      topP: options.topP || 0.9,
      topK: options.topK || 40,
      repeatPenalty: options.repeatPenalty || 1.1,
      stopSequences: options.stopSequences || ['</s>', '<|im_end|>'],
    };

    if (!((Platform.OS === 'android' || Platform.OS === 'ios') && QwenTFLiteModule)) {
      throw new Error(
        'Native module not available. Local inference requires Android/iOS with native support.'
      );
    }

    try {
      // Call native inference
      const result = await QwenTFLiteModule.generateText(prompt, inferenceOptions);

      if (!result.success) {
        throw new Error(result.error || 'Inference failed');
      }

      const latencyMs = Date.now() - startTime;
      const tokensPerSecond = (result.tokensGenerated / (latencyMs / 1000)).toFixed(1);

      return {
        text: result.text,
        tokensGenerated: result.tokensGenerated,
        latencyMs,
        tokensPerSecond: parseFloat(tokensPerSecond),
        finishReason: result.finishReason || 'eos',
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown inference error';
      throw new Error(`Inference failed: ${errorMessage}`);
    }
  }

  /**
   * Fallback inference REMOVED - NO FALLBACKS
   * This method has been removed to ensure only actual model inference is used
   */

  /**
   * Get current model status
   */
  getStatus(): ModelLoadStatus {
    return {
      loaded: this.loaded,
      modelId: this.modelId || undefined,
      loadTimeMs: this.loaded ? this.loadTimeMs : undefined,
    };
  }

  /**
   * Check if engine is ready
   */
  isReady(): boolean {
    return this.loaded;
  }

  /**
   * Get loaded model ID
   */
  getModelId(): string | null {
    return this.modelId;
  }
}
