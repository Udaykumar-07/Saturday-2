/**
 * Hook for managing Saturday's memories.
 */

import { useState, useEffect, useCallback } from 'react';
import { Memory, MemoryCategory, MemorySearchOptions } from '../core/types/memory';
import { getServices } from '../services/container';

export interface UseMemoryReturn {
  memories: Memory[];
  isLoading: boolean;
  addMemory: (category: MemoryCategory, key: string, value: string, confidence?: number) => Promise<Memory>;
  removeMemory: (id: string) => Promise<void>;
  searchMemories: (options?: MemorySearchOptions) => Promise<Memory[]>;
  refreshMemories: () => Promise<void>;
}

export function useMemory(): UseMemoryReturn {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const services = getServices();

  const refreshMemories = useCallback(async () => {
    try {
      setIsLoading(true);
      const results = await services.memoryService.search();
      setMemories(results);
    } catch (err) {
      console.error('Failed to load memories:', err);
    } finally {
      setIsLoading(false);
    }
  }, [services]);

  useEffect(() => {
    refreshMemories();
  }, [refreshMemories]);

  const addMemory = useCallback(
    async (category: MemoryCategory, key: string, value: string, confidence = 0.8) => {
      const created = await services.memoryService.add(category, key, value, confidence);
      await refreshMemories();
      return created;
    },
    [services, refreshMemories]
  );

  const removeMemory = useCallback(
    async (id: string) => {
      await services.memoryService.remove(id);
      await refreshMemories();
    },
    [services, refreshMemories]
  );

  const searchMemories = useCallback(
    async (options?: MemorySearchOptions) => {
      return services.memoryService.search(options);
    },
    [services]
  );

  return {
    memories,
    isLoading,
    addMemory,
    removeMemory,
    searchMemories,
    refreshMemories,
  };
}
