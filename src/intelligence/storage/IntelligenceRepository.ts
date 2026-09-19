/**
 * Intelligence Repository for Saturday.
 *
 * Persists custom providers, benchmark records, evaluations, and routing
 * telemetry into local storage via SettingsRepository.
 */

import { SettingsRepository } from '../../storage/SettingsRepository';
import {
  BenchmarkRecord,
  EvaluationRun,
  IntelligenceProviderEntry,
  RoutingFeedback,
} from '../../core/types/intelligence';

const KEYS = {
  PROVIDERS: 'intelligence:custom_providers',
  BENCHMARKS: 'intelligence:benchmarks',
  EVALUATIONS: 'intelligence:evaluations',
  FEEDBACK: 'intelligence:feedback',
} as const;

export class IntelligenceRepository {
  constructor(private settingsRepo: SettingsRepository) {}

  /**
   * Save custom provider entries.
   */
  async saveProviders(providers: IntelligenceProviderEntry[]): Promise<void> {
    await this.settingsRepo.set(KEYS.PROVIDERS, providers);
  }

  /**
   * Load custom provider entries.
   */
  async loadProviders(): Promise<IntelligenceProviderEntry[]> {
    const data = await this.settingsRepo.get<IntelligenceProviderEntry[]>(KEYS.PROVIDERS);
    return data || [];
  }

  /**
   * Save benchmark records.
   */
  async saveBenchmarks(records: BenchmarkRecord[]): Promise<void> {
    await this.settingsRepo.set(KEYS.BENCHMARKS, records);
  }

  /**
   * Load benchmark records.
   */
  async loadBenchmarks(): Promise<BenchmarkRecord[]> {
    const data = await this.settingsRepo.get<BenchmarkRecord[]>(KEYS.BENCHMARKS);
    return data || [];
  }

  /**
   * Save evaluation runs.
   */
  async saveEvaluations(runs: EvaluationRun[]): Promise<void> {
    await this.settingsRepo.set(KEYS.EVALUATIONS, runs);
  }

  /**
   * Load evaluation runs.
   */
  async loadEvaluations(): Promise<EvaluationRun[]> {
    const data = await this.settingsRepo.get<EvaluationRun[]>(KEYS.EVALUATIONS);
    return data || [];
  }

  /**
   * Save feedback entries.
   */
  async saveFeedback(entries: RoutingFeedback[]): Promise<void> {
    await this.settingsRepo.set(KEYS.FEEDBACK, entries);
  }

  /**
   * Load feedback entries.
   */
  async loadFeedback(): Promise<RoutingFeedback[]> {
    const data = await this.settingsRepo.get<RoutingFeedback[]>(KEYS.FEEDBACK);
    return data || [];
  }
}
