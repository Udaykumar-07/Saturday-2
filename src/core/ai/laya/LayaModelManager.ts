/**
 * Laya model download and storage manager.
 *
 * Downloads the INT4 quantized Laya ONNX model from HuggingFace,
 * stores it in app data directory, and manages the model lifecycle.
 *
 * Follows the same offline-first pattern as Saturday's Qwen model:
 *   1. Download model files once from HuggingFace CDN
 *   2. Store in persistent app storage
 *   3. Load into ONNX Runtime
 *   4. Never need internet again for intent classification
 *
 * Model source: techtheist/laya-onnx (INT4 quantized, ~262MB)
 * Files needed:
 *   - en/model_int4.onnx (~262MB) - the ONNX model
 *   - en/rl_agent_config.json (~900B) - model config
 *   - en/tokenizer.json (~several MB) - tokenizer vocabulary
 *   - en/tokenizer_config.json (~300B) - tokenizer metadata
 */

import * as FileSystem from 'expo-file-system';
import type { LayaModelConfig } from './LayaTypes';
import { LayaTokenizer } from './LayaTokenizer';
import type { LayaRuntime } from './LayaRuntime';
import { createOnnxSession } from './LayaOnnxBridge';

export type LayaDownloadState =
  | 'NOT_INSTALLED'
  | 'DOWNLOADING'
  | 'VERIFYING'
  | 'INSTALLED'
  | 'ERROR';

const HF_BASE = 'https://huggingface.co/techtheist/laya-onnx/resolve/main/en';

const LAYA_FILES = [
  { name: 'model_int4.onnx', url: `${HF_BASE}/model_int4.onnx`, required: true },
  { name: 'rl_agent_config.json', url: `${HF_BASE}/rl_agent_config.json`, required: true },
  { name: 'tokenizer.json', url: `${HF_BASE}/tokenizer.json`, required: true },
  { name: 'tokenizer_config.json', url: `${HF_BASE}/tokenizer_config.json`, required: false },
];

export interface LayaDownloadProgress {
  file: string;
  fileIndex: number;
  totalFiles: number;
  bytesDownloaded: number;
  totalBytes: number;
  overallPercent: number;
}

export class LayaModelManager {
  private _state: LayaDownloadState = 'NOT_INSTALLED';
  private _error: string | null = null;
  private modelDir: string;

  constructor() {
    this.modelDir = `${FileSystem.documentDirectory}laya-model/`;
  }

  get state(): LayaDownloadState {
    return this._state;
  }

  get error(): string | null {
    return this._error;
  }

  get modelDirectory(): string {
    return this.modelDir;
  }

  /**
   * Check if the model is already installed locally.
   */
  async isInstalled(): Promise<boolean> {
    try {
      for (const file of LAYA_FILES) {
        if (!file.required) continue;
        const path = this.modelDir + file.name;
        const info = await FileSystem.getInfoAsync(path);
        if (!info.exists) return false;
      }
      this._state = 'INSTALLED';
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Download all model files from HuggingFace.
   */
  async download(
    onProgress?: (progress: LayaDownloadProgress) => void,
  ): Promise<void> {
    this._state = 'DOWNLOADING';
    this._error = null;

    try {
      // Ensure model directory exists
      const dirInfo = await FileSystem.getInfoAsync(this.modelDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.modelDir, { intermediates: true });
      }

      for (let i = 0; i < LAYA_FILES.length; i++) {
        const file = LAYA_FILES[i];
        const destPath = this.modelDir + file.name;

        console.log(`[Laya] Downloading ${file.name} (${i + 1}/${LAYA_FILES.length})...`);

        // Check if already downloaded
        const existing = await FileSystem.getInfoAsync(destPath);
        if (existing.exists && existing.size && existing.size > 0) {
          console.log(`[Laya] ${file.name} already exists, skipping`);
          onProgress?.({
            file: file.name,
            fileIndex: i,
            totalFiles: LAYA_FILES.length,
            bytesDownloaded: existing.size,
            totalBytes: existing.size,
            overallPercent: ((i + 1) / LAYA_FILES.length) * 100,
          });
          continue;
        }

        // Download with progress tracking
        const downloadResumable = FileSystem.createDownloadResumable(
          file.url,
          destPath,
          {},
          (downloadProgress) => {
            const filePercent =
              downloadProgress.totalBytesExpectedToWrite > 0
                ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
                : 0;
            const overallPercent = ((i + filePercent) / LAYA_FILES.length) * 100;
            onProgress?.({
              file: file.name,
              fileIndex: i,
              totalFiles: LAYA_FILES.length,
              bytesDownloaded: downloadProgress.totalBytesWritten,
              totalBytes: downloadProgress.totalBytesExpectedToWrite,
              overallPercent,
            });
          },
        );

        const result = await downloadResumable.downloadAsync();
        if (!result) {
          if (file.required) {
            throw new Error(`Failed to download required file: ${file.name}`);
          }
          console.warn(`[Laya] Optional file ${file.name} download failed, skipping`);
        } else {
          console.log(`[Laya] Downloaded ${file.name} (${result.headers?.['content-length'] || 'unknown'} bytes)`);
        }
      }

      // Verify all required files exist
      this._state = 'VERIFYING';
      const installed = await this.isInstalled();
      if (!installed) {
        throw new Error('Model verification failed: some required files are missing after download');
      }

      this._state = 'INSTALLED';
      console.log('[Laya] All model files downloaded and verified');
    } catch (error) {
      this._state = 'ERROR';
      this._error = error instanceof Error ? error.message : String(error);
      console.error(`[Laya] Download failed: ${this._error}`);
      throw error;
    }
  }

  /**
   * Load the model config from disk.
   */
  async loadConfig(): Promise<LayaModelConfig> {
    const configPath = this.modelDir + 'rl_agent_config.json';
    const content = await FileSystem.readAsStringAsync(configPath);
    return JSON.parse(content) as LayaModelConfig;
  }

  /**
   * Load and create the tokenizer from disk.
   */
  async loadTokenizer(): Promise<LayaTokenizer> {
    const tokenizerPath = this.modelDir + 'tokenizer.json';
    const content = await FileSystem.readAsStringAsync(tokenizerPath);
    const json = JSON.parse(content);
    return LayaTokenizer.fromJSON(json);
  }

  /**
   * Load model components and initialize a LayaRuntime instance.
   */
  async loadRuntime(runtime: LayaRuntime): Promise<void> {
    runtime.setLoading();
    try {
      const config = await this.loadConfig();
      const tokenizer = await this.loadTokenizer();
      const modelPath = this.getModelPath();
      const session = await createOnnxSession(modelPath);
      runtime.initialize(session, tokenizer, config);
      console.log('[Laya] Runtime successfully loaded and initialized');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      runtime.setError(msg);
      console.error('[Laya] Failed to initialize runtime:', error);
      throw error;
    }
  }

  /**
   * Get the full path to the ONNX model file.
   */
  getModelPath(): string {
    return this.modelDir + 'model_int4.onnx';
  }

  /**
   * Delete all downloaded model files.
   */
  async deleteModel(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.modelDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.modelDir, { idempotent: true });
      }
      this._state = 'NOT_INSTALLED';
      console.log('[Laya] Model files deleted');
    } catch (error) {
      console.error('[Laya] Failed to delete model files:', error);
    }
  }

  /**
   * Get storage usage information.
   */
  async getStorageInfo(): Promise<{ totalBytes: number; files: Array<{ name: string; size: number }> }> {
    const files: Array<{ name: string; size: number }> = [];
    let totalBytes = 0;

    for (const file of LAYA_FILES) {
      const path = this.modelDir + file.name;
      try {
        const info = await FileSystem.getInfoAsync(path, { size: true });
        if (info.exists && info.size) {
          files.push({ name: file.name, size: info.size });
          totalBytes += info.size;
        }
      } catch {
        // File doesn't exist
      }
    }

    return { totalBytes, files };
  }
}
