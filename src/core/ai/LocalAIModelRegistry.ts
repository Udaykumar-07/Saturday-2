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
  // Qwen Models
  {
    id: 'qwen2.5-0.5b-instruct-int4',
    name: 'Qwen 2.5 0.5B Instruct',
    provider: 'Alibaba Cloud',
    parameters: '0.49B',
    quantization: 'INT4',
    diskSize: '394 MB',
    contextWindow: 32768,
    description:
      'Compact sub-1B model with good reasoning and instruction following.',
    recommended: false,
    speedRating: 'Ultra-Fast',
    bestFor: 'Basic assistance, fast responses on low-end devices',
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
    recommended: true, // Changed to recommended - more stable than 2B models
    speedRating: 'Fast',
    bestFor: 'Complex reasoning, detailed explanations, advanced task planning',
    downloaded: false,
  },
  
  // Gemma 2 Models (Google)
  {
    id: 'gemma-2-2b-instruct-int4',
    name: 'Gemma 2 2B Instruct (INT4)',
    provider: 'Google',
    parameters: '2B',
    quantization: 'INT4',
    diskSize: '1.5 GB',
    contextWindow: 8192,
    description:
      'High-quality 2B model from Google. Note: INT4 quantization may cause text corruption on some devices.',
    recommended: false, // Changed - INT4 corruption issues
    speedRating: 'Fast',
    bestFor: '4GB RAM devices - Use Qwen 1.5B for better stability',
    downloaded: false,
  },
  {
    id: 'gemma-2-2b-instruct-int8',
    name: 'Gemma 2 2B Instruct (INT8)',
    provider: 'Google',
    parameters: '2B',
    quantization: 'INT8',
    diskSize: '2.5 GB',
    contextWindow: 8192,
    description:
      'Higher quality quantization of Gemma 2 2B. Better accuracy, slightly slower.',
    recommended: false,
    speedRating: 'Moderate',
    bestFor: 'High-quality responses on 4-6GB RAM devices',
    downloaded: false,
  },
  {
    id: 'gemma-2-9b-instruct-int4',
    name: 'Gemma 2 9B Instruct (INT4)',
    provider: 'Google',
    parameters: '9B',
    quantization: 'INT4',
    diskSize: '5.5 GB',
    contextWindow: 8192,
    description:
      'Professional-grade 9B model. Best quality but requires 6GB+ RAM.',
    recommended: false,
    speedRating: 'Moderate',
    bestFor: 'High-end devices (6GB+ RAM) - Professional quality',
    downloaded: false,
  },
  
  // Phi-3 Models (Microsoft)
  {
    id: 'phi-3-mini-4k-instruct-int4',
    name: 'Phi-3 Mini 4K Instruct (INT4)',
    provider: 'Microsoft',
    parameters: '3.8B',
    quantization: 'INT4',
    diskSize: '2.3 GB',
    contextWindow: 4096,
    description:
      'Compact reasoning model from Microsoft. Excellent for coding and logical tasks.',
    recommended: false,
    speedRating: 'Fast',
    bestFor: 'Coding assistance, math, logical reasoning on 4GB+ RAM',
    downloaded: false,
  },
  {
    id: 'phi-3.5-mini-instruct-int4',
    name: 'Phi-3.5 Mini Instruct (INT4)',
    provider: 'Microsoft',
    parameters: '3.8B',
    quantization: 'INT4',
    diskSize: '2.4 GB',
    contextWindow: 8192,
    description:
      'Latest Phi-3.5 with extended context. Improved instruction following and reasoning.',
    recommended: false,
    speedRating: 'Fast',
    bestFor: 'Advanced reasoning, longer conversations on 4GB+ RAM',
    downloaded: false,
  },
  
  // TinyLlama Models
  {
    id: 'tinyllama-1.1b-chat-int4',
    name: 'TinyLlama 1.1B Chat (INT4)',
    provider: 'TinyLlama',
    parameters: '1.1B',
    quantization: 'INT4',
    diskSize: '669 MB',
    contextWindow: 2048,
    description:
      'Ultra-compact chat model. Blazing fast responses on any device.',
    recommended: false,
    speedRating: 'Ultra-Fast',
    bestFor: 'Quick responses, low-end devices (2GB+ RAM)',
    downloaded: false,
  },
  
  // Mistral Models
  {
    id: 'mistral-7b-instruct-int4',
    name: 'Mistral 7B Instruct v0.3 (INT4)',
    provider: 'Mistral AI',
    parameters: '7B',
    quantization: 'INT4',
    diskSize: '4.4 GB',
    contextWindow: 32768,
    description:
      'High-performance 7B model. Excellent general-purpose capabilities.',
    recommended: false,
    speedRating: 'Moderate',
    bestFor: 'Professional use on 6GB+ RAM devices',
    downloaded: false,
  },
  {
    id: 'ministral-8b-instruct-int4',
    name: 'Ministral 8B Instruct 2410 (INT4)',
    provider: 'Mistral AI',
    parameters: '8B',
    quantization: 'INT4',
    diskSize: '4.8 GB',
    contextWindow: 32768,
    description:
      'Latest Ministral model. State-of-the-art performance for edge inference.',
    recommended: false,
    speedRating: 'Moderate',
    bestFor: 'Best-in-class quality on 6GB+ RAM devices',
    downloaded: false,
  },
];

export const DEFAULT_LOCAL_MODEL_ID = 'qwen2.5-1.5b-instruct-int4'; // More stable than 2B models

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

  getDefaultSync(): LocalModelInfo {
    const defaultModel = this.models.get(DEFAULT_LOCAL_MODEL_ID);
    if (defaultModel && defaultModel.downloaded) {
      return defaultModel;
    }
    const downloaded = Array.from(this.models.values()).find(m => m.downloaded);
    if (downloaded) return downloaded;
    return defaultModel || ALL_LOCAL_MODELS[0];
  }

  registerCustom(model: LocalModelInfo): void {
    this.models.set(model.id, model);
  }
}
