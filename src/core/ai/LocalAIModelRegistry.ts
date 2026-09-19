/**
 * Local AI Model Registry — catalog of validated on-device and local models.
 * Curated specifically for mobile edge inference performance and resource efficiency.
 * 
 * Updated to only show actually downloaded models from Model Management.
 */

import { TFLiteModelManager } from './tflite/TFLiteModelManager';

export interface LocalModelInfo {
  id: string;
  name: string;
  provider: string;
  parameters: string;
  quantization: string;
  diskSize: string;
  contextWindow: number;
  description: string;
  recommended?: boolean;
  speedRating: 'Fast' | 'Ultra-Fast' | 'Moderate';
  bestFor: string;
  localPath?: string; // Path to downloaded model file
  downloaded: boolean; // Whether model is actually downloaded
}

// Static model definitions (all available models, regardless of download status)
export const ALL_LOCAL_MODELS: LocalModelInfo[] = [
  {
    id: 'qwen2.5-0.5b-instruct-int4',
    name: 'Qwen 2.5 0.5B Instruct',
    provider: 'Alibaba Cloud',
    parameters: '0.49B',
    quantization: 'INT4',
    diskSize: '394 MB',
    contextWindow: 32768,
    description:
      'Top-tier sub-1B model with exceptional reasoning, instruction following, and multilingual support.',
    recommended: true,
    speedRating: 'Fast',
    bestFor: 'Everyday assistance, task extraction, fast phone actions',
    downloaded: false,
  },
  {
    id: 'qwen2.5-1.5b-instruct-int4',
    name: 'Qwen 2.5 1.5B Instruct',
    provider: 'Alibaba Cloud',
    parameters: '1.5B',
    quantization: 'INT4',
    diskSize: '934 MB',
    contextWindow: 32768,
    description:
      'Larger Qwen model with enhanced reasoning capabilities for more complex tasks.',
    recommended: false,
    speedRating: 'Moderate',
    bestFor: 'Complex reasoning, detailed explanations, advanced task planning',
    downloaded: false,
  },
];

export const DEFAULT_LOCAL_MODEL_ID = 'qwen2.5-0.5b-instruct-int4';

export class LocalAIModelRegistry {
  private models: Map<string, LocalModelInfo> = new Map();
  private modelManager: TFLiteModelManager;

  constructor() {
    this.modelManager = new TFLiteModelManager();
    
    // Initialize with static models
    for (const model of ALL_LOCAL_MODELS) {
      this.models.set(model.id, { ...model });
    }
  }

  /**
   * Get all models, but only return downloaded ones
   */
  async getAll(): Promise<LocalModelInfo[]> {
    await this.refreshDownloadStatus();
    
    // Only return downloaded models
    return Array.from(this.models.values()).filter(m => m.downloaded);
  }

  /**
   * Get all models regardless of download status (for admin/management)
   */
  getAllIncludingNotDownloaded(): LocalModelInfo[] {
    return Array.from(this.models.values());
  }

  /**
   * Refresh download status from TFLiteModelManager
   */
  private async refreshDownloadStatus(): Promise<void> {
    try {
      await this.modelManager.initialize();
      const downloadedModels = await this.modelManager.getDownloadedModels();
      
      // Update download status and paths
      for (const [id, model] of this.models) {
        const downloaded = downloadedModels.find(m => m.modelId === id);
        if (downloaded && downloaded.status === 'ready') {
          model.downloaded = true;
          model.localPath = downloaded.localPath;
        } else {
          model.downloaded = false;
          model.localPath = undefined;
        }
      }
    } catch (error) {
      console.error('Failed to refresh model download status:', error);
    }
  }

  async get(id: string): Promise<LocalModelInfo | undefined> {
    await this.refreshDownloadStatus();
    const model = this.models.get(id);
    
    // Only return if downloaded
    if (model && model.downloaded) {
      return model;
    }
    return undefined;
  }

  async getDefault(): Promise<LocalModelInfo | undefined> {
    await this.refreshDownloadStatus();
    
    // Try to get the default model if downloaded
    const defaultModel = this.models.get(DEFAULT_LOCAL_MODEL_ID);
    if (defaultModel && defaultModel.downloaded) {
      return defaultModel;
    }
    
    // Otherwise return first downloaded model
    const downloadedModels = Array.from(this.models.values()).filter(m => m.downloaded);
    return downloadedModels[0];
  }

  /**
   * Synchronous version for backward compatibility (returns empty if not initialized)
   */
  getAllSync(): LocalModelInfo[] {
    return Array.from(this.models.values()).filter(m => m.downloaded);
  }

  getSync(id: string): LocalModelInfo | undefined {
    const model = this.models.get(id);
    return model && model.downloaded ? model : undefined;
  }

  getDefaultSync(): LocalModelInfo | undefined {
    const defaultModel = this.models.get(DEFAULT_LOCAL_MODEL_ID);
    if (defaultModel && defaultModel.downloaded) {
      return defaultModel;
    }
    return Array.from(this.models.values()).find(m => m.downloaded);
  }

  registerCustom(model: LocalModelInfo): void {
    this.models.set(model.id, model);
  }
}
