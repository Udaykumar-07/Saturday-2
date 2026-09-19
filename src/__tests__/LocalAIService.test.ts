/**
 * Tests for LocalAIService.
 */

import { LocalAIService } from '../services/LocalAIService';
import { LocalAIProvider } from '../core/ai/LocalAIProvider';
import { SettingsRepository } from '../storage/SettingsRepository';

class MockStorageAdapter {
  private data = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }

  async getAllKeys(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.data.keys());
    return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
  }

  async multiGet(keys: string[]): Promise<Record<string, string | null>> {
    const res: Record<string, string | null> = {};
    for (const k of keys) res[k] = this.data.get(k) || null;
    return res;
  }

  async multiSet(entries: Array<[string, string]>): Promise<void> {
    for (const [k, v] of entries) this.data.set(k, v);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }
}

describe('LocalAIService', () => {
  let provider: LocalAIProvider;
  let settingsRepo: SettingsRepository;
  let service: LocalAIService;

  beforeEach(() => {
    provider = new LocalAIProvider({ enabled: true, mode: 'embedded' });
    settingsRepo = new SettingsRepository(new MockStorageAdapter());
    service = new LocalAIService(provider, settingsRepo);
  });

  test('initializes with default settings', async () => {
    const settings = await service.getSettings();
    expect(settings.activeModelId).toBe('qwen2.5:0.5b');
    expect(settings.mode).toBe('auto');
    expect(settings.enabled).toBe(true);
    expect(service.getActiveModel().id).toBe('qwen2.5:0.5b');
  });

  test('selects a different model and persists', async () => {
    const success = await service.selectModel('smollm2:360m');
    expect(success).toBe(true);
    expect(service.getActiveModel().id).toBe('smollm2:360m');

    // Create fresh service to verify persistence
    const newService = new LocalAIService(provider, settingsRepo);
    const reloaded = await newService.getSettings();
    expect(reloaded.activeModelId).toBe('smollm2:360m');
  });

  test('updates mode and endpoint URL with persistence', async () => {
    await service.setMode('endpoint');
    await service.setEndpointUrl('http://192.168.1.50:11434');

    const settings = await service.getSettings();
    expect(settings.mode).toBe('endpoint');
    expect(settings.endpointUrl).toBe('http://192.168.1.50:11434');
    expect(provider.getMode()).toBe('endpoint');
    expect(provider.getEndpointUrl()).toBe('http://192.168.1.50:11434');
  });

  test('runs test inference successfully', async () => {
    await service.setMode('embedded');
    const output = await service.testInference('Hello Saturday');
    expect(output).toBeDefined();
    expect(output.length).toBeGreaterThan(0);
    // New greeting responses are concise and don't always include 'Saturday'
    expect(output).toMatch(/help|ready|today|do/i);
  });
});
