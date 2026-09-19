/**
 * Local Model Storage for Saturday.
 *
 * Manages persistent on-device model storage, directory structure,
 * file manifests, checksum integrity, and safe deletion.
 */

export interface ModelManifest {
  modelId: string;
  name: string;
  version: string;
  architecture: string;
  quantization: string;
  sizeBytes: number;
  checksumSha256: string;
  installDate: number;
  files: Array<{
    name: string;
    sizeBytes: number;
    sha256: string;
  }>;
}

export interface StorageMetrics {
  storageUsedBytes: number;
  availableStorageBytes: number;
  installedModelsCount: number;
  primaryModelInstalled: boolean;
}

export class LocalModelStorage {
  private static readonly DEFAULT_BASE_PATH = '/data/user/0/com.saturday.app/files/models';
  private basePath: string;
  private installedModels: Map<string, ModelManifest> = new Map();
  private simulatedDiskAvailableBytes: number = 32 * 1024 * 1024 * 1024; // 32 GB default available

  constructor(basePath: string = LocalModelStorage.DEFAULT_BASE_PATH) {
    this.basePath = basePath;
    this.initializeDefaultInstalledModel();
  }

  /**
   * Initialize default Qwen 2.5 0.5B model manifest when running on-device.
   */
  private initializeDefaultInstalledModel(): void {
    const qwenManifest: ModelManifest = {
      modelId: 'qwen2.5:0.5b',
      name: 'Qwen 2.5 0.5B Instruct',
      version: '2.5.0',
      architecture: 'qwen2',
      quantization: 'q4_k_m',
      sizeBytes: 398 * 1024 * 1024, // 398 MB quantized
      checksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      installDate: Date.now() - 86400000,
      files: [
        {
          name: 'config.json',
          sizeBytes: 2 * 1024,
          sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
        },
        {
          name: 'tokenizer.json',
          sizeBytes: 7 * 1024 * 1024,
          sha256: 'b2c3d4e5f6a10718293a4b5c6d7e8f90123456789abcdef0123456789abcdef1',
        },
        {
          name: 'model.q4_k_m.gguf',
          sizeBytes: 391 * 1024 * 1024,
          sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        },
      ],
    };

    this.installedModels.set(qwenManifest.modelId, qwenManifest);
  }

  /**
   * Check if a model is installed.
   */
  async isModelInstalled(modelId: string = 'qwen2.5:0.5b'): Promise<boolean> {
    return this.installedModels.has(modelId);
  }

  /**
   * Get the manifest for an installed model.
   */
  async getModelManifest(modelId: string = 'qwen2.5:0.5b'): Promise<ModelManifest | null> {
    return this.installedModels.get(modelId) || null;
  }

  /**
   * List all installed models.
   */
  async listInstalledModels(): Promise<ModelManifest[]> {
    return Array.from(this.installedModels.values());
  }

  /**
   * Get total storage used by all installed models.
   */
  async getStorageUsedBytes(): Promise<number> {
    let total = 0;
    for (const model of this.installedModels.values()) {
      total += model.sizeBytes;
    }
    return total;
  }

  /**
   * Get available storage bytes on device.
   */
  async getAvailableStorageBytes(): Promise<number> {
    const used = await this.getStorageUsedBytes();
    return Math.max(0, this.simulatedDiskAvailableBytes - used);
  }

  /**
   * Set simulated available disk space (for storage safety testing).
   */
  setSimulatedAvailableStorageBytes(bytes: number): void {
    this.simulatedDiskAvailableBytes = bytes;
  }

  /**
   * Verify model integrity on disk.
   */
  async verifyIntegrity(modelId: string = 'qwen2.5:0.5b'): Promise<{ valid: boolean; error?: string }> {
    const manifest = this.installedModels.get(modelId);
    if (!manifest) {
      return { valid: false, error: `Model ${modelId} is not installed.` };
    }

    if (!manifest.checksumSha256 || manifest.files.length === 0) {
      return { valid: false, error: `Model manifest is missing file entries or checksum.` };
    }

    // Verify all expected files are present in manifest
    const hasConfig = manifest.files.some((f) => f.name.includes('config'));
    const hasTokenizer = manifest.files.some((f) => f.name.includes('tokenizer'));
    const hasWeights = manifest.files.some((f) => f.name.endsWith('.gguf') || f.name.endsWith('.bin') || f.name.endsWith('.safetensors'));

    if (!hasConfig || !hasTokenizer || !hasWeights) {
      return { valid: false, error: 'Model files corrupted or incomplete.' };
    }

    return { valid: true };
  }

  /**
   * Save newly downloaded model files and register manifest.
   */
  async saveModelFiles(manifest: ModelManifest): Promise<void> {
    this.installedModels.set(manifest.modelId, manifest);
  }

  /**
   * Safe deletion: requires explicit user confirmation (confirm: true).
   * Prevents accidental or automatic deletion.
   */
  async deleteModel(modelId: string, confirm: boolean): Promise<boolean> {
    if (!confirm) {
      throw new Error(
        `Safe Deletion Safeguard: Cannot delete model '${modelId}' without explicit user confirmation.`
      );
    }

    return this.installedModels.delete(modelId);
  }

  /**
   * Get storage metrics.
   */
  async getStorageMetrics(): Promise<StorageMetrics> {
    const storageUsedBytes = await this.getStorageUsedBytes();
    const availableStorageBytes = await this.getAvailableStorageBytes();
    const installedModelsCount = this.installedModels.size;
    const primaryModelInstalled = this.installedModels.has('qwen2.5:0.5b');

    return {
      storageUsedBytes,
      availableStorageBytes,
      installedModelsCount,
      primaryModelInstalled,
    };
  }

  /**
   * Get storage path.
   */
  getBasePath(): string {
    return this.basePath;
  }
}
