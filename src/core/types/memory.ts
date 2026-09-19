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

/**
 * Normalized memory type classification.
 */
export type MemoryType =
  | 'PERSONAL_FACT'
  | 'PREFERENCE'
  | 'USER_INSTRUCTION'
  | 'PROJECT_CONTEXT'
  | 'RECURRING_CONTEXT';

export interface Memory {
  /** Unique memory identifier */
  id: string;
  /** Category of this memory */
  category: MemoryCategory;
  /** Normalized memory type classification */
  type?: MemoryType;
  /** Searchable key/label (e.g. 'user.name', 'user.preference.theme') */
  key: string;
  /** The memory content */
  value: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Origin of memory (e.g. 'user_stated', 'inferred') */
  source?: string;
  /** Unix timestamp in milliseconds */
  createdAt: number;
  /** Unix timestamp in milliseconds */
  updatedAt: number;
}

/**
 * Memory candidate extracted from user input before validation and persistence.
 */
export interface MemoryCandidate {
  type: MemoryType;
  key: string;
  value: string;
  confidence: number;
  source: 'user_stated' | 'inferred';
  category: MemoryCategory;
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
