/**
 * Context provider that contributes relevant memories.
 */

import { AIContext, ContextProvider } from '../types/context';
import { MemoryService } from '../../services/MemoryService';

export class MemoryContextProvider implements ContextProvider {
  readonly id = 'memory';
  readonly name = 'Memory Context';

  constructor(private memoryService: MemoryService) {}

  async getContext(): Promise<Partial<AIContext>> {
    // Get user preferences and facts for context
    const preferences = await this.memoryService.search({
      category: 'preferences',
      limit: 10,
    });

    const facts = await this.memoryService.search({
      category: 'facts',
      limit: 10,
    });

    const interactionStyle = await this.memoryService.search({
      category: 'interaction_style',
      limit: 5,
    });

    const memories = [...preferences, ...facts, ...interactionStyle];

    return {
      memories: memories.length > 0 ? memories : undefined,
    };
  }
}
