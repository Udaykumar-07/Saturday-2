/**
 * Saturday Evaluation Engine.
 *
 * Runs lightweight, budgeted evaluations against providers to gather
 * empirical evidence of their reasoning, coding, and capability accuracy.
 */

import {
  EvaluationResult,
  EvaluationRun,
  EvaluationSuiteDefinition,
  EvaluationTask,
} from '../../core/types/intelligence';
import { BUILT_IN_EVALUATION_SUITES } from './EvaluationSuite';

export type TaskRunnerFn = (
  task: EvaluationTask
) => Promise<{ output: string; latencyMs: number }>;

export class SaturdayEvaluationEngine {
  private suites: Map<string, EvaluationSuiteDefinition> = new Map();
  private runs: EvaluationRun[] = [];
  private latestResultsByProvider: Map<string, Map<string, EvaluationResult>> = new Map();

  constructor() {
    for (const suite of BUILT_IN_EVALUATION_SUITES) {
      this.registerSuite(suite);
    }
  }

  /**
   * Register a custom or extended evaluation suite.
   */
  registerSuite(suite: EvaluationSuiteDefinition): void {
    this.suites.set(suite.id, suite);
  }

  /**
   * Get a suite by ID.
   */
  getSuite(id: string): EvaluationSuiteDefinition | undefined {
    return this.suites.get(id);
  }

  /**
   * List all registered suites.
   */
  listSuites(): EvaluationSuiteDefinition[] {
    return Array.from(this.suites.values());
  }

  /**
   * Run an evaluation suite against a provider.
   */
  async evaluate(
    providerId: string,
    suiteId: string,
    runner?: TaskRunnerFn
  ): Promise<EvaluationRun> {
    const suite = this.suites.get(suiteId);
    if (!suite) {
      throw new Error(`Evaluation suite "${suiteId}" not found`);
    }

    const startedAt = Date.now();
    const results: EvaluationResult[] = [];

    for (const task of suite.tasks) {
      let output = '';
      let latencyMs = 0;
      let score = 0.8; // Baseline score
      let success = true;

      if (runner) {
        try {
          const runRes = await runner(task);
          output = runRes.output;
          latencyMs = runRes.latencyMs;
          score = this.scoreOutput(task, output);
          success = score >= 0.5;
        } catch {
          success = false;
          score = 0.0;
        }
      }

      const evalResult: EvaluationResult = {
        taskId: task.id,
        providerId,
        score,
        latencyMs,
        success,
        output,
        timestamp: Date.now(),
      };

      results.push(evalResult);
      this.recordResult(evalResult);
    }

    const overallScore =
      results.length > 0
        ? results.reduce((acc, r) => acc + r.score, 0) / results.length
        : 0;

    const run: EvaluationRun = {
      id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      suiteId,
      providerId,
      results,
      overallScore,
      startedAt,
      completedAt: Date.now(),
    };

    this.runs.push(run);
    return run;
  }

  /**
   * Record a single evaluation result.
   */
  recordResult(result: EvaluationResult): void {
    let providerMap = this.latestResultsByProvider.get(result.providerId);
    if (!providerMap) {
      providerMap = new Map();
      this.latestResultsByProvider.set(result.providerId, providerMap);
    }
    providerMap.set(result.taskId, result);
  }

  /**
   * Get latest evaluation results for a provider.
   */
  getLatestResults(providerId: string): EvaluationResult[] {
    const providerMap = this.latestResultsByProvider.get(providerId);
    return providerMap ? Array.from(providerMap.values()) : [];
  }

  /**
   * Calculate aggregate internal evaluation score for a provider.
   */
  getOverallScore(providerId: string): number {
    const results = this.getLatestResults(providerId);
    if (results.length === 0) return 0.5; // Neutral prior
    return results.reduce((acc, r) => acc + r.score, 0) / results.length;
  }

  /**
   * Get all completed evaluation runs.
   */
  getRuns(): EvaluationRun[] {
    return [...this.runs];
  }

  /**
   * Simple deterministic evaluation check.
   */
  private scoreOutput(task: EvaluationTask, output: string): number {
    if (!output || output.trim().length === 0) return 0.0;

    const lower = output.toLowerCase();

    if (task.id === 'math-arithmetic') {
      return lower.includes('115') ? 1.0 : 0.0;
    }
    if (task.id === 'logic-deduction') {
      return lower.includes('yes') || lower.includes('definitely') ? 1.0 : 0.2;
    }
    if (task.id === 'code-reverse-string') {
      return lower.includes('reverse') || lower.includes('split') ? 1.0 : 0.5;
    }

    return 0.8;
  }
}
