/**
 * Generic storage adapter interface.
 * All persistent storage goes through this abstraction.
 */

export interface StorageAdapter {
  /** Get a value by key. Returns null if not found. */
  get(key: string): Promise<string | null>;

  /** Set a value by key. */
  set(key: string, value: string): Promise<void>;

  /** Remove a value by key. */
  remove(key: string): Promise<void>;

  /** Get all keys matching a prefix. */
  getAllKeys(prefix?: string): Promise<string[]>;

  /** Get multiple values by keys. */
  multiGet(keys: string[]): Promise<Record<string, string | null>>;

  /** Set multiple key-value pairs. */
  multiSet(entries: Array<[string, string]>): Promise<void>;

  /** Clear all keys matching a prefix. */
  clear(prefix?: string): Promise<void>;
}
