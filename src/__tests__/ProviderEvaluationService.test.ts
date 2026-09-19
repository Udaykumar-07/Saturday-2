/**
 * Tests for ProviderEvaluationService.
 */

import { ProviderEvaluationService } from '../intelligence/routing/ProviderEvaluationService';
import { BenchmarkStore } from '../intelligence/benchmarks/BenchmarkStore';
import { SaturdayEvaluationEngine } from '../intelligence/evaluation/SaturdayEvaluationEngine';
import { LatencyTracker } from '../intelligence/performance/LatencyTracker';
import { CostEstimator } from '../intelligence/cost/CostEstimator';
import { PrivacyRouter } from '../intelligence/privacy/PrivacyRouter';
import { RoutingFeedbackService } from '../intelligence/feedback/RoutingFeedbackService';
import { RoutingScorer } from '../intelligence/routing/RoutingScorer';
import { IntelligenceRegistry } from '../intelligence/registry/IntelligenceRegistry';

describe('ProviderEvaluationService', () => {
  let service: ProviderEvaluationService;
  let registry: IntelligenceRegistry;

  beforeEach(() => {
    registry = new IntelligenceRegistry();
    const benchmarkStore = new BenchmarkStore();
    const evalEngine = new SaturdayEvaluationEngine();
    const latencyTracker = new LatencyTracker();
    const costEstimator = new CostEstimator();
    const privacyRouter = new PrivacyRouter();
    const feedbackService = new RoutingFeedbackService();
    const scorer = new RoutingScorer();

    service = new ProviderEvaluationService(
      benchmarkStore,
      evalEngine,
      latencyTracker,
      costEstimator,
      privacyRouter,
      feedbackService,
      scorer
    );
  });

  test('evaluates candidates and sorts by overallScore descending', () => {
    const candidates = registry.getActiveProviders();
    const evaluations = service.evaluate(
      {
        capabilities: ['TEXT_GENERATION'],
        reasoningLevel: 'basic',
        toolUseRequired: false,
        externalAccessRequired: false,
        localOnly: false,
        privacyLevel: 'standard',
        multiStep: false,
      },
      candidates
    );

    expect(evaluations.length).toBe(candidates.length);
    for (let i = 0; i < evaluations.length - 1; i++) {
      expect(evaluations[i].overallScore).toBeGreaterThanOrEqual(evaluations[i + 1].overallScore);
    }
  });

  test('computes capability match and privacy scores correctly', () => {
    const candidates = registry.getActiveProviders();
    const evaluations = service.evaluate(
      {
        capabilities: ['MEDIA_PLAYBACK'],
        reasoningLevel: 'none',
        toolUseRequired: true,
        externalAccessRequired: false,
        localOnly: true,
        privacyLevel: 'local',
        multiStep: false,
      },
      candidates
    );

    const androidEval = evaluations.find((e) => e.providerId === 'android_actions');
    expect(androidEval).toBeDefined();
    expect(androidEval?.capabilityMatch).toBe(1.0);
    expect(androidEval?.privacy).toBe(1.0);
  });
});
