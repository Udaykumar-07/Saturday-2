/**
 * Tests for MemoryRetrievalService.
 */

import { MemoryRetrievalService } from '../core/memory/MemoryRetrievalService';
import { MemoryService } from '../services/MemoryService';
import { MemoryRepository } from '../storage/MemoryRepository';
import { StorageAdapter } from '../storage/StorageAdapter';

class TestStorageAdapter implements StorageAdapter {
  private data = new Map<string, string>();
  async get(key: string) { return this.data.get(key) ?? null; }
  async set(key: string, value: string) { this.data.set(key, value); }
  async remove(key: string) { this.data.delete(key); }
  async getAllKeys() { return Array.from(this.data.keys()); }
  async multiGet(keys: string[]) {
    const res: Record<string, string | null> = {};
    for (const k of keys) res[k] = this.data.get(k) ?? null;
    return res;
  }
  async multiSet(entries: Array<[string, string]>) {
    for (const [k, v] of entries) this.data.set(k, v);
  }
  async clear() { this.data.clear(); }
}

describe('MemoryRetrievalService', () => {
  let storage: TestStorageAdapter;
  let memoryRepo: MemoryRepository;
  let memoryService: MemoryService;
  let retrievalService: MemoryRetrievalService;

  beforeEach(() => {
    storage = new TestStorageAdapter();
    memoryRepo = new MemoryRepository(storage);
    memoryService = new MemoryService(memoryRepo);
    retrievalService = new MemoryRetrievalService(memoryService);
  });

  test('recognizes memory queries across semantic variations', () => {
    expect(retrievalService.isMemoryQuery('What is my name?')).toBe(true);
    expect(retrievalService.isMemoryQuery("What's my name?")).toBe(true);
    expect(retrievalService.isMemoryQuery('Who am I?')).toBe(true);
    expect(retrievalService.isMemoryQuery('What should you call me?')).toBe(true);
    expect(retrievalService.isMemoryQuery('What do you call me?')).toBe(true);
    expect(retrievalService.isMemoryQuery('Do you remember my name?')).toBe(true);
    expect(retrievalService.isMemoryQuery('Tell me my name')).toBe(true);
    expect(retrievalService.isMemoryQuery('What do you remember about me?')).toBe(true);

    // Negative cases
    expect(retrievalService.isMemoryQuery('What is the capital of France?')).toBe(false);
    expect(retrievalService.isMemoryQuery('Open YouTube')).toBe(false);
  });

  test('retrieves stored user name without searching external tools', async () => {
    await memoryService.setKey('user.name', 'Uday', 'facts', 'PERSONAL_FACT');

    const result = await retrievalService.answerQuery('What is my name?');
    expect(result.found).toBe(true);
    expect(result.answer).toBe('Your name is Uday.');
    expect(result.memoryValue).toBe('Uday');
  });

  test('returns friendly prompt when name is not yet saved instead of searching web', async () => {
    const result = await retrievalService.answerQuery('What is my name?');
    expect(result.found).toBe(false);
    expect(result.answer).toBe("I don't have your name saved yet. What should I call you?");
    expect(result.answer).not.toContain('Chrome');
    expect(result.answer).not.toContain('search');
  });

  test('lists stored memories when requested', async () => {
    await memoryService.setKey('user.name', 'Uday', 'facts', 'PERSONAL_FACT');
    await memoryService.setKey('user.preference.theme', 'dark mode', 'preferences', 'PREFERENCE');

    const result = await retrievalService.answerQuery('What do you remember about me?');
    expect(result.found).toBe(true);
    expect(result.answer).toContain('Uday');
    expect(result.answer).toContain('dark mode');
  });
});
