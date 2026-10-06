/**
 * Benchmark Data for Provider Routing Intelligence.
 *
 * Contains known benchmark scores for external and local providers,
 * used by RoutingDecisionEngine for evidence-based provider selection.
 */

export interface BenchmarkScore {
  /** Benchmark name (e.g., MMLU, HumanEval) */
  name: string;
  /** Numeric score */
  score: number;
  /** Metric type (e.g., accuracy, pass@1) */
  metric: string;
}

/**
 * Known benchmark scores for all available providers.
 * Keys match provider IDs in the registry.
 */
export const KNOWN_BENCHMARKS: Record<string, BenchmarkScore[]> = {
  openai_provider: [
    { name: 'MMLU', score: 88.7, metric: 'accuracy' },
    { name: 'HumanEval', score: 90.2, metric: 'pass@1' },
  ],
  anthropic_provider: [
    { name: 'MMLU', score: 88.3, metric: 'accuracy' },
    { name: 'HumanEval', score: 92.0, metric: 'pass@1' },
  ],
  google_gemini_provider: [
    { name: 'MMLU', score: 85.9, metric: 'accuracy' },
    { name: 'HumanEval', score: 84.1, metric: 'pass@1' },
  ],
  local: [
    { name: 'MMLU', score: 45.0, metric: 'accuracy' },
    { name: 'HumanEval', score: 38.0, metric: 'pass@1' },
  ],
};
