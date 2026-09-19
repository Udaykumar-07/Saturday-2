/**
 * Interface for intelligence source discovery adapters.
 * Enables modular plug-in discovery without coupling Saturday to specific APIs.
 */

import {
  IntelligenceProviderEntry,
  BenchmarkRecord,
} from '../../core/types/intelligence';

export interface IntelligenceSourceAdapter {
  /** Unique adapter identifier */
  readonly id: string;

  /** Human-readable adapter name */
  readonly name: string;

  /**
   * Discover and return available providers from this source.
   */
  fetchProviders(): Promise<IntelligenceProviderEntry[]>;

  /**
   * Optionally fetch benchmark records from this source.
   */
  fetchBenchmarks?(): Promise<BenchmarkRecord[]>;

  /**
   * Timestamp when data was last successfully fetched.
   */
  lastFetched?: number;
}
