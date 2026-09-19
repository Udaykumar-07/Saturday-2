/**
 * Tests for IntelligenceCache.
 */

import { IntelligenceCache } from '../intelligence/cache/IntelligenceCache';

describe('IntelligenceCache', () => {
  let cache: IntelligenceCache;

  beforeEach(() => {
    cache = new IntelligenceCache();
  });

  test('sets and gets cached values', () => {
    cache.set('key1', { data: 'test_value' });
    expect(cache.get<{ data: string }>('key1')?.data).toBe('test_value');
    expect(cache.has('key1')).toBe(true);
  });

  test('returns null and EXPIRED for expired entries', () => {
    // 1ms TTL
    cache.set('expiring', 'hello', -100); // Already expired
    expect(cache.get('expiring')).toBeNull();
    expect(cache.getFreshness('expiring')).toBe('EXPIRED');
  });

  test('reports correct freshness status', () => {
    expect(cache.getFreshness('non_existent')).toBe('UNKNOWN');

    cache.set('fresh_key', 'val', 1000000);
    expect(cache.getFreshness('fresh_key')).toBe('FRESH');
  });

  test('invalidates and clears cache entries', () => {
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');

    cache.invalidate('k1');
    expect(cache.has('k1')).toBe(false);
    expect(cache.has('k2')).toBe(true);

    cache.clear();
    expect(cache.has('k2')).toBe(false);
  });
});
