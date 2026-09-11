/**
 * Repository for memory persistence.
 */

import { Memory, MemoryCategory, MemorySearchOptions } from '../core/types/memory';
import { StorageAdapter } from './StorageAdapter';
import { StorageError } from '../core/types/errors';

const MEMORY_PREFIX = '@saturday/memories/';
const MEMORY_INDEX_KEY = '@saturday/memory-index';

export class MemoryRepository {
  constructor(private storage: StorageAdapter) {}

  /** Save a memory. */
  async save(memory: Memory): Promise<void> {
    const key = `${MEMORY_PREFIX}${memory.id}`;
    await this.storage.set(key, JSON.stringify(memory));
    await this.updateIndex(memory.id, 'add');
  }

  /** Load a memory by ID. */
  async load(id: string): Promise<Memory | null> {
    const key = `${MEMORY_PREFIX}${id}`;
    const raw = await this.storage.get(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as Memory;
    } catch {
      throw new StorageError(`Failed to parse memory "${id}"`);
    }
  }

  /** Delete a memory by ID. */
  async delete(id: string): Promise<void> {
    const key = `${MEMORY_PREFIX}${id}`;
    await this.storage.remove(key);
    await this.updateIndex(id, 'remove');
  }

  /** Search memories with filters. */
  async search(options: MemorySearchOptions = {}): Promise<Memory[]> {
    const allMemories = await this.loadAll();
    let results = allMemories;

    if (options.category) {
      results = results.filter((m) => m.category === options.category);
    }

    if (options.minConfidence !== undefined) {
      results = results.filter((m) => m.confidence >= (options.minConfidence ?? 0));
    }

    if (options.query) {
      const queryLower = options.query.toLowerCase();
      results = results.filter(
        (m) =>
          m.key.toLowerCase().includes(queryLower) ||
          m.value.toLowerCase().includes(queryLower)
      );
    }

    // Sort by confidence descending
    results.sort((a, b) => b.confidence - a.confidence);

    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /** Load all memories. */
  async loadAll(): Promise<Memory[]> {
    const ids = await this.getIndex();
    if (ids.length === 0) return [];

    const keys = ids.map((id) => `${MEMORY_PREFIX}${id}`);
    const values = await this.storage.multiGet(keys);
    const memories: Memory[] = [];

    for (const key of keys) {
      const raw = values[key];
      if (!raw) continue;
      try {
        memories.push(JSON.parse(raw) as Memory);
      } catch {
        // Skip malformed memories
      }
    }

    return memories;
  }

  /** Clear all memories. */
  async clearAll(): Promise<void> {
    await this.storage.clear(MEMORY_PREFIX);
    await this.storage.remove(MEMORY_INDEX_KEY);
  }

  private async getIndex(): Promise<string[]> {
    const raw = await this.storage.get(MEMORY_INDEX_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }

  private async updateIndex(id: string, action: 'add' | 'remove'): Promise<void> {
    const ids = await this.getIndex();
    if (action === 'add') {
      if (!ids.includes(id)) ids.push(id);
    } else {
      const idx = ids.indexOf(id);
      if (idx >= 0) ids.splice(idx, 1);
    }
    await this.storage.set(MEMORY_INDEX_KEY, JSON.stringify(ids));
  }
}
