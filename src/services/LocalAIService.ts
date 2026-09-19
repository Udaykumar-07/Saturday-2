/**
 * Local AI Service — manages local model selection, persistence, and inference health.
 */

import { SettingsRepository } from '../storage/SettingsRepository';
import { LocalAIProvider } from '../core/ai/LocalAIProvider';
import {
  LocalModelInfo,
  DEFAULT_LOCAL_MODEL_ID,
} from '../core/ai/LocalAIModelRegistry';
import { InferenceMode } from '../core/ai/LocalInferenceEngine';

const SETTINGS_KEY = 'local_ai_config';

export interface LocalAISettings {
  activeModelId: string;
  mode: InferenceMode;
  endpointUrl: string;
  enabled: boolean;
}

export const DEFAULT_LOCAL_AI_SETTINGS: LocalAISettings = {
  activeModelId: DEFAULT_LOCAL_MODEL_ID,
  mode: 'auto',
  endpointUrl: 'http://10.0.2.2:11434',
  enabled: true,
};

export class LocalAIService {
  private settings: LocalAISettings = { ...DEFAULT_LOCAL_AI_SETTINGS };
  private initialized = false;

  constructor(
    private provider: LocalAIProvider,
    private settingsRepo: SettingsRepository
  ) {}

  /**
   * Initialize settings from persistent storage.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const saved = await this.settingsRepo.get<LocalAISettings>(SETTINGS_KEY);
      if (saved) {
        this.settings = { ...DEFAULT_LOCAL_AI_SETTINGS, ...saved };
      }
    } catch {
      this.settings = { ...DEFAULT_LOCAL_AI_SETTINGS };
    }

    this.applySettingsToProvider();
    this.initialized = true;
  }

  /**
   * Get current settings.
   */
  async getSettings(): Promise<LocalAISettings> {
    await this.initialize();
    return { ...this.settings };
  }

  /**
   * Select active model by ID.
   */
  async selectModel(modelId: string): Promise<boolean> {
    await this.initialize();
    const success = this.provider.setModel(modelId);
    if (success) {
      this.settings.activeModelId = modelId;
      await this.persistSettings();
    }
    return success;
  }

  /**
   * Get active model details.
   */
  getActiveModel(): LocalModelInfo {
    return this.provider.getActiveModel();
  }

  /**
   * Get all supported local models.
   */
  getAllModels(): LocalModelInfo[] {
    return this.provider.getAllModels();
  }

  /**
   * Set inference mode ('auto' | 'embedded' | 'endpoint').
   */
  async setMode(mode: InferenceMode): Promise<void> {
    await this.initialize();
    this.settings.mode = mode;
    this.provider.setMode(mode);
    await this.persistSettings();
  }

  /**
   * Set local endpoint URL (e.g. http://10.0.2.2:11434 or http://127.0.0.1:11434).
   */
  async setEndpointUrl(url: string): Promise<void> {
    await this.initialize();
    this.settings.endpointUrl = url;
    this.provider.setEndpointUrl(url);
    await this.persistSettings();
  }

  /**
   * Toggle local AI enabled.
   */
  async setEnabled(enabled: boolean): Promise<void> {
    await this.initialize();
    this.settings.enabled = enabled;
    this.provider.setEnabled(enabled);
    await this.persistSettings();
  }

  /**
   * Check endpoint server health and connectivity.
   */
  async checkEndpointHealth(): Promise<{ reachable: boolean; models?: string[]; latencyMs?: number }> {
    return this.provider.checkEndpointHealth();
  }

  /**
   * Test local inference generation.
   */
  async testInference(prompt = 'Hello Saturday'): Promise<string> {
    await this.initialize();
    const response = await this.provider.generate({
      messages: [
        {
          id: `test_${Date.now()}`,
          role: 'user',
          content: prompt,
          timestamp: Date.now(),
        },
      ],
    });
    return response.content;
  }

  private applySettingsToProvider(): void {
    this.provider.setEnabled(this.settings.enabled);
    this.provider.setModel(this.settings.activeModelId);
    this.provider.setMode(this.settings.mode);
    this.provider.setEndpointUrl(this.settings.endpointUrl);
  }

  private async persistSettings(): Promise<void> {
    await this.settingsRepo.set(SETTINGS_KEY, this.settings);
  }
}
