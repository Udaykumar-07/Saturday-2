/**
 * Memory types for Saturday's local memory system.
 * Memories are categorized and scored by confidence.
 */

export type MemoryCategory =
  | 'short_term'
  | 'preferences'
  | 'facts'
  | 'habits'
  | 'interaction_style';

export const MEMORY_CATEGORIES: MemoryCategory[] = [
  'short_term',
  'preferences',
  'facts',
  'habits',
  'interaction_style',
];

export interface Memory {
  /** Unique memory identifier */
  id: string;
  /** Category of this memory */
  category: MemoryCategory;
  /** Searchable key/label */
  key: string;
  /** The memory content */
  value: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Unix timestamp in milliseconds */
  createdAt: number;
  /** Unix timestamp in milliseconds */
  updatedAt: number;
}

export interface MemorySearchOptions {
  /** Filter by category */
  category?: MemoryCategory;
  /** Search query string */
  query?: string;
  /** Minimum confidence threshold */
  minConfidence?: number;
  /** Maximum number of results */
  limit?: number;
}
