/**
 * Memory service — manages Saturday's local memory system.
 * Memories are categorized, confidence-scored, and searchable.
 */

import { Memory, MemoryCategory, MemorySearchOptions } from '../core/types/memory';
import { MemoryRepository } from '../storage/MemoryRepository';

export class MemoryService {
  constructor(private repository: MemoryRepository) {}

  /** Add a new memory. */
  async add(
    category: MemoryCategory,
    key: string,
    value: string,
    confidence = 0.8
  ): Promise<Memory> {
    const now = Date.now();
    const memory: Memory = {
      id: `mem_${now}_${Math.random().toString(36).substring(2, 9)}`,
      category,
      key,
      value,
      confidence,
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.save(memory);
    return memory;
  }

  /** Update an existing memory. */
  async update(
    id: string,
    updates: Partial<Pick<Memory, 'value' | 'confidence' | 'category'>>
  ): Promise<Memory | null> {
    const memory = await this.repository.load(id);
    if (!memory) return null;

    const updated: Memory = {
      ...memory,
      ...updates,
      updatedAt: Date.now(),
    };

    await this.repository.save(updated);
    return updated;
  }

  /** Remove a memory by ID. */
  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /** Search memories with options. */
  async search(options?: MemorySearchOptions): Promise<Memory[]> {
    return this.repository.search(options);
  }

  /**
   * Get memories relevant to a given query.
   * Phase 1: simple keyword matching.
   * Future: semantic similarity / embedding search.
   */
  async getRelevantMemories(query: string, limit = 5): Promise<Memory[]> {
    return this.repository.search({
      query,
      limit,
      minConfidence: 0.3,
    });
  }

  /** Get all memories in a category. */
  async getByCategory(category: MemoryCategory): Promise<Memory[]> {
    return this.repository.search({ category });
  }

  /** Clear all memories. */
  async clearAll(): Promise<void> {
    await this.repository.clearAll();
  }
}
