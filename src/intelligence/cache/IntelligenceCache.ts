/**
 * Intelligence Cache for Saturday.
 *
 * Provides TTL-based caching and freshness tracking for provider metadata,
 * benchmark records, and routing decisions.
 */

import { CacheEntry, DataFreshness } from '../../core/types/intelligence';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class IntelligenceCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  /**
   * Set a cached value with TTL.
   */
  set<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
    const now = Date.now();
    this.cache.set(key, {
      value,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + ttlMs,
    });
  }

  /**
   * Retrieve a cached value. Returns null if expired or missing.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      return null;
    }

    return entry.value as T;
  }

  /**
   * Retrieve the cache entry object including timestamps and TTL.
   */
  getEntry<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return entry as CacheEntry<T>;
  }

  /**
   * Check data freshness status.
   */
  getFreshness(key: string): DataFreshness {
    const entry = this.cache.get(key);
    if (!entry) return 'UNKNOWN';

    const now = Date.now();
    if (now > entry.expiresAt) {
      return 'EXPIRED';
    }

    const age = now - entry.createdAt;
    const ttl = entry.expiresAt - entry.createdAt;

    // First 70% of TTL is considered FRESH, remaining 30% is STALE
    return age < ttl * 0.7 ? 'FRESH' : 'STALE';
  }

  /**
   * Check if a valid (non-expired) entry exists.
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Invalidate a specific cache key.
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear expired cache entries.
   */
  clearExpired(): number {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear();
  }
}
