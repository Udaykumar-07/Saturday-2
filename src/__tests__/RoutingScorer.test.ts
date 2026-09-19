/**
 * Tests for RoutingScorer.
 */

import { RoutingScorer, DEFAULT_ROUTING_WEIGHTS } from '../intelligence/routing/RoutingScorer';
import { ProviderCandidateEvaluation } from '../core/types/intelligence';

describe('RoutingScorer', () => {
  let scorer: RoutingScorer;

  beforeEach(() => {
    scorer = new RoutingScorer();
  });

  test('scores candidate with perfect dimensions as 1.0', () => {
    const perfect: ProviderCandidateEvaluation = {
      providerId: 'perfect',
      capabilityMatch: 1.0,
      benchmarkEvidence: 1.0,
      evaluationScore: 1.0,
      reliability: 1.0,
      latency: 1.0,
      cost: 1.0,
      privacy: 1.0,
      availability: 1.0,
      freshness: 1.0,
      historicalSuccess: 1.0,
      overallScore: 0,
      rejected: false,
    };

    expect(scorer.score(perfect)).toBe(1.0);
  });

  test('returns 0.0 for rejected candidates', () => {
    const rejected: ProviderCandidateEvaluation = {
      providerId: 'rejected',
      capabilityMatch: 1.0,
      benchmarkEvidence: 1.0,
      evaluationScore: 1.0,
      reliability: 1.0,
      latency: 1.0,
      cost: 1.0,
      privacy: 1.0,
      availability: 1.0,
      freshness: 1.0,
      historicalSuccess: 1.0,
      overallScore: 0,
      rejected: true,
      rejectionReason: 'localOnly violation',
    };

    expect(scorer.score(rejected)).toBe(0.0);
  });

  test('weights capabilityMatch heavily by default', () => {
    const weights = scorer.getWeights();
    expect(weights.capabilityMatch).toBe(DEFAULT_ROUTING_WEIGHTS.capabilityMatch);
    expect(weights.capabilityMatch).toBeGreaterThanOrEqual(0.2);
  });

  test('allows dynamic weight updates', () => {
    scorer.setWeights({ cost: 0.5 });
    expect(scorer.getWeights().cost).toBe(0.5);
  });
});
