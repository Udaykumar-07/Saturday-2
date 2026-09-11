import { MemoryRepository } from '../src/storage/MemoryRepository';
import { MemoryService } from '../src/services/MemoryService';
import { StorageAdapter } from '../src/storage/StorageAdapter';

class MemoryStorageAdapter implements StorageAdapter {
  private store: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getAllKeys(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.store.keys());
    return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
  }

  async multiGet(keys: string[]): Promise<Record<string, string | null>> {
    const res: Record<string, string | null> = {};
    for (const key of keys) {
      res[key] = this.store.get(key) ?? null;
    }
    return res;
  }

  async multiSet(entries: Array<[string, string]>): Promise<void> {
    for (const [k, v] of entries) {
      this.store.set(k, v);
    }
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

describe('Memory System (Store & Service)', () => {
  let storage: MemoryStorageAdapter;
  let repo: MemoryRepository;
  let service: MemoryService;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
    repo = new MemoryRepository(storage);
    service = new MemoryService(repo);
  });

  test('creates and retrieves a memory across categories', async () => {
    const mem = await service.add('preferences', 'theme', 'dark', 0.9);

    expect(mem.id).toBeDefined();
    expect(mem.category).toBe('preferences');
    expect(mem.key).toBe('theme');
    expect(mem.value).toBe('dark');
    expect(mem.confidence).toBe(0.9);

    const loaded = await repo.load(mem.id);
    expect(loaded?.value).toBe('dark');
  });

  test('searches memories by keyword in key and value', async () => {
    await service.add('preferences', 'favorite_food', 'Italian pasta', 0.8);
    await service.add('facts', 'pet_name', 'Luna the dog', 0.95);
    await service.add('habits', 'morning_routine', 'drink coffee at 7am', 0.7);

    const pastaResults = await service.search({ query: 'pasta' });
    expect(pastaResults).toHaveLength(1);
    expect(pastaResults[0].key).toBe('favorite_food');

    const coffeeResults = await service.getRelevantMemories('coffee');
    expect(coffeeResults).toHaveLength(1);
    expect(coffeeResults[0].key).toBe('morning_routine');
  });

  test('filters memories by category and confidence', async () => {
    await service.add('preferences', 'music', 'jazz', 0.9);
    await service.add('preferences', 'genre', 'sci-fi', 0.4);
    await service.add('facts', 'birthday', 'June 1', 0.95);

    const prefs = await service.getByCategory('preferences');
    expect(prefs).toHaveLength(2);

    const highConfidencePrefs = await service.search({
      category: 'preferences',
      minConfidence: 0.8,
    });
    expect(highConfidencePrefs).toHaveLength(1);
    expect(highConfidencePrefs[0].key).toBe('music');
  });

  test('updates an existing memory', async () => {
    const mem = await service.add('facts', 'city', 'San Francisco', 0.8);

    const updated = await service.update(mem.id, {
      value: 'Tokyo',
      confidence: 0.95,
    });

    expect(updated?.value).toBe('Tokyo');
    expect(updated?.confidence).toBe(0.95);

    const reloaded = await repo.load(mem.id);
    expect(reloaded?.value).toBe('Tokyo');
  });

  test('removes a memory', async () => {
    const mem = await service.add('short_term', 'temp_note', 'call dentist', 0.5);
    expect(await repo.load(mem.id)).not.toBeNull();

    await service.remove(mem.id);
    expect(await repo.load(mem.id)).toBeNull();
  });
});
