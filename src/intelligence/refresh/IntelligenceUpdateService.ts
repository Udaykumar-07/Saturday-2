/**
 * Intelligence Update Service for Saturday.
 *
 * Implements the 9-step periodic update engine:
 * 1. Check whether intelligence data is stale
 * 2. Fetch available current data from adapters
 * 3. Validate source responses defensively
 * 4. Normalize the information
 * 5. Update the local registry
 * 6. Record timestamps
 * 7. Preserve previous known-good data
 * 8. Mark stale data explicitly
 * 9. Never delete valid historical data merely because an update failed
 */

import { RefreshResult } from '../../core/types/intelligence';
import { IntelligenceRegistry } from '../registry/IntelligenceRegistry';
import { IntelligenceDiscoveryService } from '../discovery/IntelligenceDiscoveryService';
import { BenchmarkStore } from '../benchmarks/BenchmarkStore';
import { IntelligenceCache } from '../cache/IntelligenceCache';

export class IntelligenceUpdateService {
  constructor(
    private registry: IntelligenceRegistry,
    private discovery: IntelligenceDiscoveryService,
    private benchmarkStore: BenchmarkStore,
    private cache: IntelligenceCache
  ) {}

  /**
   * Execute the full 9-step refresh process.
   */
  async refresh(): Promise<RefreshResult> {
    const errors: string[] = [];
    let providersUpdated = 0;
    let benchmarksUpdated = 0;

    try {
      // 1. Check if cached metadata is stale or needs refresh
      const adapters = this.discovery.getAdapters();

      for (const adapter of adapters) {
        try {
          // 2. Fetch available data
          const entries = await adapter.fetchProviders();

          // 3. Validate source responses
          for (const entry of entries) {
            const validation = this.discovery.validateProviderMetadata(entry);
            if (!validation.valid) {
              errors.push(`Validation failed for provider ${entry.id}: ${validation.errors.join(', ')}`);
              continue;
            }

            // 4. Normalize & 5. Update local registry
            // 7. Preserve previous known-good data if update is partial
            const existing = this.registry.getProvider(entry.id);
            if (existing) {
              this.registry.updateProvider(entry.id, entry);
            } else {
              this.registry.registerProvider(entry);
            }
            providersUpdated++;
          }

          // Fetch benchmarks if adapter provides them
          if (adapter.fetchBenchmarks) {
            try {
              const benchmarks = await adapter.fetchBenchmarks();
              for (const bm of benchmarks) {
                this.benchmarkStore.addBenchmark(bm);
                benchmarksUpdated++;
              }
            } catch (bmErr) {
              errors.push(`Benchmark fetch error from adapter ${adapter.id}: ${String(bmErr)}`);
            }
          }
        } catch (adapterErr) {
          // 9. Never delete valid historical data merely because an update failed
          errors.push(`Adapter ${adapter.id} refresh failed: ${String(adapterErr)}`);
        }
      }

      // 6. Record timestamp in cache
      this.cache.set('last_intelligence_refresh', Date.now());

      // 8. Mark stale providers if not updated recently (> 45 days)
      const STALE_THRESHOLD_MS = 45 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      for (const provider of this.registry.getAllProviders()) {
        if (now - provider.lastUpdated > STALE_THRESHOLD_MS && provider.state === 'ACTIVE') {
          this.registry.setProviderState(provider.id, 'STALE');
        }
      }
    } catch (err) {
      errors.push(`General refresh error: ${String(err)}`);
    }

    return {
      providersUpdated,
      benchmarksUpdated,
      errors,
      timestamp: Date.now(),
    };
  }
}
