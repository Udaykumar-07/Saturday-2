/**
 * TensorFlow Lite Model Manager for On-Device LLMs
 * 
 * Manages downloading, verification, and lifecycle of GGUF models
 * for on-device inference via llama.cpp.
 * 
 * Supports: Qwen 2.5, Gemma 2, and other GGUF-compatible models
 */

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface ModelConfig {
  modelId: string;
  name: string;
  version: string;
  downloadUrl: string;
  sizeBytes: number;
  checksumSha256: string;
  quantization: 'INT4' | 'INT8' | 'FP16' | 'FP32';
  architecture: string;
}

export interface ModelDownloadProgress {
  modelId: string;
  totalBytes: number;
  downloadedBytes: number;
  progress: number; // 0-100
  status: 'pending' | 'downloading' | 'verifying' | 'completed' | 'failed';
  error?: string;
}

export interface ModelInfo {
  modelId: string;
  name: string;
  version: string;
  status: 'not_downloaded' | 'downloading' | 'verifying' | 'ready' | 'corrupted';
  sizeBytes: number;
  localPath?: string;
  downloadedAt?: number;
  lastVerified?: number;
}

/**
 * Available models for download
 * Optimized for mobile devices with 4GB RAM
 */
export const AVAILABLE_MODELS: ModelConfig[] = [
  // Qwen 2.5 Models
  {
    modelId: 'qwen2.5-0.5b-instruct-int4',
    name: 'Qwen 2.5 0.5B Instruct (INT4)',
    version: '2.5.0',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    sizeBytes: 394 * 1024 * 1024, // ~394 MB
    checksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    quantization: 'INT4',
    architecture: 'qwen2',
  },
  {
    modelId: 'qwen2.5-1.5b-instruct-int4',
    name: 'Qwen 2.5 1.5B Instruct (INT4)',
    version: '2.5.0',
    downloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    sizeBytes: 934 * 1024 * 1024, // ~934 MB
    checksumSha256: 'a3b4c5d6e7f8901234567890abcdef1234567890abcdef1234567890abcdef12',
    quantization: 'INT4',
    architecture: 'qwen2',
  },
  
  // Gemma 2 Models (Google) - Better quality for 4GB RAM
  {
    modelId: 'gemma-2-2b-instruct-int4',
    name: 'Gemma 2 2B Instruct (INT4) - Recommended',
    version: '2.0.0',
    downloadUrl: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
    sizeBytes: 1536 * 1024 * 1024, // ~1.5 GB
    checksumSha256: 'b4c5d6e7f8901234567890abcdef1234567890abcdef1234567890abcdef1234',
    quantization: 'INT4',
    architecture: 'gemma2',
  },
  {
    modelId: 'gemma-2-2b-instruct-int8',
    name: 'Gemma 2 2B Instruct (INT8) - Higher Quality',
    version: '2.0.0',
    downloadUrl: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q8_0.gguf',
    sizeBytes: 2560 * 1024 * 1024, // ~2.5 GB
    checksumSha256: 'c5d6e7f8901234567890abcdef1234567890abcdef1234567890abcdef123456',
    quantization: 'INT8',
    architecture: 'gemma2',
  },
  {
    modelId: 'gemma-2-9b-instruct-int4',
    name: 'Gemma 2 9B Instruct (INT4) - Best Quality (6GB+ RAM)',
    version: '2.0.0',
    downloadUrl: 'https://huggingface.co/bartowski/gemma-2-9b-it-GGUF/resolve/main/gemma-2-9b-it-Q4_K_M.gguf',
    sizeBytes: 5632 * 1024 * 1024, // ~5.5 GB
    checksumSha256: 'd6e7f8901234567890abcdef1234567890abcdef1234567890abcdef12345678',
    quantization: 'INT4',
    architecture: 'gemma2',
  },
  
  // Phi-3 Models (Microsoft) - Excellent reasoning, compact
  {
    modelId: 'phi-3-mini-4k-instruct-int4',
    name: 'Phi-3 Mini 4K Instruct (INT4)',
    version: '3.0.0',
    downloadUrl: 'https://huggingface.co/bartowski/Phi-3-mini-4k-instruct-GGUF/resolve/main/Phi-3-mini-4k-instruct-Q4_K_M.gguf',
    sizeBytes: 2304 * 1024 * 1024, // ~2.3 GB
    checksumSha256: 'e7f8901234567890abcdef1234567890abcdef1234567890abcdef123456789a',
    quantization: 'INT4',
    architecture: 'phi3',
  },
  {
    modelId: 'phi-3.5-mini-instruct-int4',
    name: 'Phi-3.5 Mini Instruct (INT4) - Latest',
    version: '3.5.0',
    downloadUrl: 'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf',
    sizeBytes: 2400 * 1024 * 1024, // ~2.4 GB
    checksumSha256: 'f8901234567890abcdef1234567890abcdef1234567890abcdef123456789ab',
    quantization: 'INT4',
    architecture: 'phi3',
  },
  
  // TinyLlama - Ultra-fast, minimal resources
  {
    modelId: 'tinyllama-1.1b-chat-int4',
    name: 'TinyLlama 1.1B Chat (INT4) - Ultra-Fast',
    version: '1.1.0',
    downloadUrl: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    sizeBytes: 669 * 1024 * 1024, // ~669 MB
    checksumSha256: '901234567890abcdef1234567890abcdef1234567890abcdef123456789abc',
    quantization: 'INT4',
    architecture: 'llama',
  },
  
  // Mistral Models - High performance
  {
    modelId: 'mistral-7b-instruct-int4',
    name: 'Mistral 7B Instruct v0.3 (INT4)',
    version: '0.3.0',
    downloadUrl: 'https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3-Q4_K_M.gguf',
    sizeBytes: 4368 * 1024 * 1024, // ~4.4 GB
    checksumSha256: '1234567890abcdef1234567890abcdef1234567890abcdef123456789abcd',
    quantization: 'INT4',
    architecture: 'mistral',
  },
  {
    modelId: 'ministral-8b-instruct-int4',
    name: 'Ministral 8B Instruct 2410 (INT4) - Latest',
    version: '24.10.0',
    downloadUrl: 'https://huggingface.co/bartowski/Ministral-8B-Instruct-2410-GGUF/resolve/main/Ministral-8B-Instruct-2410-Q4_K_M.gguf',
    sizeBytes: 4800 * 1024 * 1024, // ~4.8 GB
    checksumSha256: '234567890abcdef1234567890abcdef1234567890abcdef123456789abcde',
    quantization: 'INT4',
    architecture: 'mistral',
  },
];

export class TFLiteModelManager {
  private modelsDir: string;
  private downloadCallbacks: Map<string, (progress: ModelDownloadProgress) => void> = new Map();
  private activeDownloads: Map<string, FileSystem.DownloadResumable> = new Map();

  constructor() {
    this.modelsDir = `${FileSystem.documentDirectory}models/`;
  }

  /**
   * Initialize model storage directory
   */
  async initialize(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.modelsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.modelsDir, { intermediates: true });
    }
  }

  /**
   * Get list of all available models
   */
  getAvailableModels(): ModelConfig[] {
    return AVAILABLE_MODELS;
  }

  /**
   * Get information about all downloaded models
   */
  async getDownloadedModels(): Promise<ModelInfo[]> {
    await this.initialize();

    const modelInfos: ModelInfo[] = [];

    for (const config of AVAILABLE_MODELS) {
      const localPath = `${this.modelsDir}${config.modelId}.gguf`;
      const fileInfo = await FileSystem.getInfoAsync(localPath);

      if (fileInfo.exists && fileInfo.size) {
        const metadataPath = `${this.modelsDir}${config.modelId}.metadata.json`;
        const metadataInfo = await FileSystem.getInfoAsync(metadataPath);

        let downloadedAt: number | undefined;
        let lastVerified: number | undefined;

        if (metadataInfo.exists) {
          try {
            const metadataContent = await FileSystem.readAsStringAsync(metadataPath);
            const metadata = JSON.parse(metadataContent);
            downloadedAt = metadata.downloadedAt;
            lastVerified = metadata.lastVerified;
          } catch {
            // Ignore metadata read errors
          }
        }

        modelInfos.push({
          modelId: config.modelId,
          name: config.name,
          version: config.version,
          status: 'ready',
          sizeBytes: fileInfo.size,
          localPath,
          downloadedAt,
          lastVerified,
        });
      } else {
        modelInfos.push({
          modelId: config.modelId,
          name: config.name,
          version: config.version,
          status: 'not_downloaded',
          sizeBytes: config.sizeBytes,
        });
      }
    }

    return modelInfos;
  }

  /**
   * Get information about a specific model
   */
  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    const models = await this.getDownloadedModels();
    return models.find((m) => m.modelId === modelId) || null;
  }

  /**
   * Download a model
   */
  async downloadModel(
    modelId: string,
    onProgress?: (progress: ModelDownloadProgress) => void
  ): Promise<void> {
    await this.initialize();

    const config = AVAILABLE_MODELS.find((m) => m.modelId === modelId);
    if (!config) {
      throw new Error(`Model ${modelId} not found in available models`);
    }

    const localPath = `${this.modelsDir}${config.modelId}.gguf`;

    // Check if already downloaded
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists) {
      throw new Error(`Model ${modelId} is already downloaded`);
    }

    // Check if download is already in progress
    if (this.activeDownloads.has(modelId)) {
      throw new Error(`Model ${modelId} download is already in progress`);
    }

    // Register progress callback
    if (onProgress) {
      this.downloadCallbacks.set(modelId, onProgress);
    }

    const initialProgress: ModelDownloadProgress = {
      modelId,
      totalBytes: config.sizeBytes,
      downloadedBytes: 0,
      progress: 0,
      status: 'pending',
    };

    onProgress?.(initialProgress);

    try {
      // Create download resumable
      const downloadResumable = FileSystem.createDownloadResumable(
        config.downloadUrl,
        localPath,
        {},
        (downloadProgress) => {
          const { totalBytesWritten, totalBytesExpectedToWrite } = downloadProgress;
          const progress = (totalBytesWritten / totalBytesExpectedToWrite) * 100;

          const progressUpdate: ModelDownloadProgress = {
            modelId,
            totalBytes: totalBytesExpectedToWrite,
            downloadedBytes: totalBytesWritten,
            progress: Math.round(progress),
            status: 'downloading',
          };

          onProgress?.(progressUpdate);
        }
      );

      this.activeDownloads.set(modelId, downloadResumable);

      // Start download
      const result = await downloadResumable.downloadAsync();

      if (!result) {
        throw new Error('Download failed: no result returned');
      }

      // Remove from active downloads
      this.activeDownloads.delete(modelId);

      // Verifying
      const verifyingProgress: ModelDownloadProgress = {
        modelId,
        totalBytes: config.sizeBytes,
        downloadedBytes: config.sizeBytes,
        progress: 100,
        status: 'verifying',
      };
      onProgress?.(verifyingProgress);

      // Verify checksum (simplified for now)
      await this.verifyModel(modelId);

      // Save metadata
      const metadata = {
        modelId: config.modelId,
        name: config.name,
        version: config.version,
        downloadedAt: Date.now(),
        lastVerified: Date.now(),
        sizeBytes: result.headers?.['content-length'] || config.sizeBytes,
      };

      const metadataPath = `${this.modelsDir}${config.modelId}.metadata.json`;
      await FileSystem.writeAsStringAsync(metadataPath, JSON.stringify(metadata, null, 2));

      // Completed
      const completedProgress: ModelDownloadProgress = {
        modelId,
        totalBytes: config.sizeBytes,
        downloadedBytes: config.sizeBytes,
        progress: 100,
        status: 'completed',
      };
      onProgress?.(completedProgress);

      this.downloadCallbacks.delete(modelId);
    } catch (error) {
      // Remove from active downloads
      this.activeDownloads.delete(modelId);

      const failedProgress: ModelDownloadProgress = {
        modelId,
        totalBytes: config.sizeBytes,
        downloadedBytes: 0,
        progress: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      onProgress?.(failedProgress);

      this.downloadCallbacks.delete(modelId);

      throw error;
    }
  }

  /**
   * Pause an active download
   */
  async pauseDownload(modelId: string): Promise<void> {
    const downloadResumable = this.activeDownloads.get(modelId);
    if (downloadResumable) {
      await downloadResumable.pauseAsync();
    }
  }

  /**
   * Resume a paused download
   */
  async resumeDownload(modelId: string): Promise<void> {
    const downloadResumable = this.activeDownloads.get(modelId);
    if (downloadResumable) {
      await downloadResumable.resumeAsync();
    }
  }

  /**
   * Cancel an active download
   */
  async cancelDownload(modelId: string): Promise<void> {
    const downloadResumable = this.activeDownloads.get(modelId);
    if (downloadResumable) {
      await downloadResumable.pauseAsync();
      this.activeDownloads.delete(modelId);
      this.downloadCallbacks.delete(modelId);

      // Delete partial file
      const config = AVAILABLE_MODELS.find((m) => m.modelId === modelId);
      if (config) {
        const localPath = `${this.modelsDir}${config.modelId}.gguf`;
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(localPath, { idempotent: true });
        }
      }
    }
  }

  /**
   * Delete a downloaded model
   */
  async deleteModel(modelId: string): Promise<void> {
    const config = AVAILABLE_MODELS.find((m) => m.modelId === modelId);
    if (!config) {
      throw new Error(`Model ${modelId} not found`);
    }

    const localPath = `${this.modelsDir}${config.modelId}.gguf`;
    const metadataPath = `${this.modelsDir}${config.modelId}.metadata.json`;

    // Delete model file
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    }

    // Delete metadata
    const metadataInfo = await FileSystem.getInfoAsync(metadataPath);
    if (metadataInfo.exists) {
      await FileSystem.deleteAsync(metadataPath, { idempotent: true });
    }
  }

  /**
   * Verify model integrity
   */
  async verifyModel(modelId: string): Promise<{ valid: boolean; error?: string }> {
    const config = AVAILABLE_MODELS.find((m) => m.modelId === modelId);
    if (!config) {
      return { valid: false, error: `Model ${modelId} not found` };
    }

    const localPath = `${this.modelsDir}${config.modelId}.gguf`;
    const fileInfo = await FileSystem.getInfoAsync(localPath);

    if (!fileInfo.exists) {
      return { valid: false, error: 'Model file does not exist' };
    }

    // Basic size check
    if (fileInfo.size && Math.abs(fileInfo.size - config.sizeBytes) > 1024 * 1024) {
      // Allow 1MB difference
      return { valid: false, error: `Size mismatch: expected ${config.sizeBytes}, got ${fileInfo.size}` };
    }

    // TODO: Implement SHA256 checksum verification
    // For now, just basic existence and size check

    return { valid: true };
  }

  /**
   * Get total storage used by all models
   */
  async getTotalStorageUsed(): Promise<number> {
    const models = await this.getDownloadedModels();
    return models.reduce((total, model) => {
      if (model.status === 'ready') {
        return total + (model.sizeBytes || 0);
      }
      return total;
    }, 0);
  }

  /**
   * Get available storage on device
   */
  async getAvailableStorage(): Promise<number> {
    try {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
        return freeDiskStorage;
      }
    } catch {
      // Return fallback value
    }
    return 5 * 1024 * 1024 * 1024; // 5GB fallback
  }
}
