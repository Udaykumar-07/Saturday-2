/**
 * Intelligence Refresh Scheduler for Saturday.
 *
 * Coordinates daily or on-demand refreshes of provider and benchmark data.
 * Designed to degrade gracefully if offline or if Android background execution is restricted.
 */

import { RefreshResult } from '../../core/types/intelligence';
import { IntelligenceUpdateService } from './IntelligenceUpdateService';
import { IntelligenceCache } from '../cache/IntelligenceCache';

const DEFAULT_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class IntelligenceRefreshScheduler {
  private isRefreshing = false;

  constructor(
    private updateService: IntelligenceUpdateService,
    private cache: IntelligenceCache,
    private refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS
  ) {}

  /**
   * Check if intelligence data is stale and perform refresh if needed.
   */
  async checkAndRefresh(): Promise<RefreshResult | null> {
    if (this.isRefreshing) {
      return null;
    }

    if (!this.isStale()) {
      return null;
    }

    return this.forceRefresh();
  }

  /**
   * Check if the last refresh exceeds the target interval.
   */
  isStale(): boolean {
    const lastRefresh = this.getLastRefreshTime();
    if (!lastRefresh) return true;
    return Date.now() - lastRefresh >= this.refreshIntervalMs;
  }

  /**
   * Get timestamp of the last successful refresh.
   */
  getLastRefreshTime(): number | null {
    return this.cache.get<number>('last_intelligence_refresh');
  }

  /**
   * Force an immediate refresh regardless of schedule.
   */
  async forceRefresh(): Promise<RefreshResult> {
    if (this.isRefreshing) {
      return {
        providersUpdated: 0,
        benchmarksUpdated: 0,
        errors: ['Refresh already in progress'],
        timestamp: Date.now(),
      };
    }

    this.isRefreshing = true;
    try {
      return await this.updateService.refresh();
    } finally {
      this.isRefreshing = false;
    }
  }
}
