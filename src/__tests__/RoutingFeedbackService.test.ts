/**
 * Tests for RoutingFeedbackService.
 */

import { RoutingFeedbackService } from '../intelligence/feedback/RoutingFeedbackService';

describe('RoutingFeedbackService', () => {
  let feedbackService: RoutingFeedbackService;

  beforeEach(() => {
    feedbackService = new RoutingFeedbackService();
  });

  test('records feedback and retrieves history', () => {
    feedbackService.recordFeedback({
      routingDecisionId: 'dec-1',
      providerId: 'local',
      taskType: 'CHAT',
      success: true,
      latencyMs: 120,
    });

    feedbackService.recordFeedback({
      routingDecisionId: 'dec-2',
      providerId: 'local',
      taskType: 'CHAT',
      success: false,
      failureReason: 'timeout',
    });

    const history = feedbackService.getHistory('local');
    expect(history.length).toBe(2);

    const failures = feedbackService.getRecentFailures('local');
    expect(failures.length).toBe(1);
    expect(failures[0].failureReason).toBe('timeout');
  });

  test('computes smoothed historical success score', () => {
    // 9 successes, 1 failure
    for (let i = 0; i < 9; i++) {
      feedbackService.recordFeedback({
        routingDecisionId: `dec-${i}`,
        providerId: 'reliable_model',
        taskType: 'REASONING',
        success: true,
      });
    }
    feedbackService.recordFeedback({
      routingDecisionId: 'dec-fail',
      providerId: 'reliable_model',
      taskType: 'REASONING',
      success: false,
    });

    const score = feedbackService.calculateHistoricalSuccessScore('reliable_model');
    // Bayesian Laplace smoothing: (9 + 2) / (10 + 3) = 11/13 ≈ 0.846
    expect(score).toBeGreaterThan(0.8);
    expect(score).toBeLessThan(0.9);
  });
});
