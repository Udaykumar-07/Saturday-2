/**
 * EpisodicMemoryStore - Fast in-memory storage for reflections
 * Stores last 1-3 reflections per query pattern
 * 
 * OPTIMIZATION: Uses Map for O(1) lookups, no database I/O
 */

import { Reflection } from '../reflection/ReflectionGenerator';

export class EpisodicMemoryStore {
  private maxReflectionsPerPattern = 3; // Per Reflexion paper
  private reflectionsByPattern: Map<string, Reflection[]> = new Map();
  private allReflections: Map<string, Reflection> = new Map();

  /**
   * INSTANT: Store reflection in memory
   * Automatically prunes old reflections
   */
  async storeReflection(reflection: Reflection): Promise<void> {
    // Store in global map
    this.allReflections.set(reflection.id, reflection);

    // Store by pattern for fast retrieval
    const pattern = reflection.queryPattern;
    const existing = this.reflectionsByPattern.get(pattern) || [];
    
    // Add new reflection
    existing.push(reflection);

    // Keep only last N reflections (FIFO)
    if (existing.length > this.maxReflectionsPerPattern) {
      const removed = existing.shift(); // Remove oldest
      if (removed) {
        this.allReflections.delete(removed.id);
      }
    }

    this.reflectionsByPattern.set(pattern, existing);

    console.log(`📝 Stored reflection: ${pattern} (${existing.length}/${this.maxReflectionsPerPattern})`);
  }

  /**
   * INSTANT: Retrieve relevant reflections for a query
   * Returns up to 3 most recent reflections matching the pattern
   */
  async retrieveRelevantReflections(
    userInput: string,
    queryPattern: string
  ): Promise<Reflection[]> {
    const reflections = this.reflectionsByPattern.get(queryPattern) || [];
    
    // Return most recent first
    return reflections.slice().reverse();
  }

  /**
   * INSTANT: Get all reflections for a pattern
   */
  async getReflectionsByPattern(pattern: string): Promise<Reflection[]> {
    return this.reflectionsByPattern.get(pattern) || [];
  }

  /**
   * INSTANT: Clear all reflections (for testing)
   */
  async clear(): Promise<void> {
    this.reflectionsByPattern.clear();
    this.allReflections.clear();
  }

  /**
   * INSTANT: Get storage stats
   */
  getStats(): { totalReflections: number; patternCount: number } {
    return {
      totalReflections: this.allReflections.size,
      patternCount: this.reflectionsByPattern.size,
    };
  }
}
