/**
 * Comprehensive Routing Decision Engine Tests.
 *
 * Verifies that Saturday dynamically routes tasks to the appropriate
 * local, model, agent, API, or multi-step execution target based on requirements.
 */

import { RoutingDecisionEngine } from '../intelligence/routing/RoutingDecisionEngine';
import { IntelligenceRegistry } from '../intelligence/registry/IntelligenceRegistry';
import { HardConstraintFilter } from '../intelligence/routing/HardConstraintFilter';
import { ProviderEvaluationService } from '../intelligence/routing/ProviderEvaluationService';
import { BenchmarkStore } from '../intelligence/benchmarks/BenchmarkStore';
import { SaturdayEvaluationEngine } from '../intelligence/evaluation/SaturdayEvaluationEngine';
import { LatencyTracker } from '../intelligence/performance/LatencyTracker';
import { CostEstimator } from '../intelligence/cost/CostEstimator';
import { PrivacyRouter } from '../intelligence/privacy/PrivacyRouter';
import { RoutingFeedbackService } from '../intelligence/feedback/RoutingFeedbackService';
import { RoutingScorer } from '../intelligence/routing/RoutingScorer';
import { TaskRequirements } from '../core/types/external';
import { CredentialStore } from '../core/external/authentication/CredentialStore';

describe('RoutingDecisionEngine', () => {
  let engine: RoutingDecisionEngine;
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
    const credentialStore = new CredentialStore();

    const hardConstraintFilter = new HardConstraintFilter(privacyRouter, costEstimator);
    const evaluationService = new ProviderEvaluationService(
      benchmarkStore,
      evalEngine,
      latencyTracker,
      costEstimator,
      privacyRouter,
      feedbackService,
      scorer
    );

    engine = new RoutingDecisionEngine(
      registry,
      hardConstraintFilter,
      evaluationService,
      benchmarkStore,
      credentialStore
    );
  });

  // 1. Device Info Question: "What's my battery percentage?"
  test('routes device info query to local ActionEngine', async () => {
    const requirements: TaskRequirements = {
      capabilities: ['DEVICE_INFO'],
      reasoningLevel: 'none',
      toolUseRequired: true,
      externalAccessRequired: false,
      localOnly: true,
      privacyLevel: 'local',
      multiStep: false,
    };

    const decision = await engine.decide(requirements);

    expect(decision.selectedProvider).toBe('android_actions');
    expect(decision.executionTarget).toBe('ANDROID_ACTION');
    expect(decision.requiresConfirmation).toBe(false);
  });

  // 2. App & Media Action: "Open YouTube and search for music"
  test('routes app launch and media actions to Android Action Engine', async () => {
    const requirements: TaskRequirements = {
      capabilities: ['APP_MANAGEMENT', 'MEDIA_PLAYBACK'],
      reasoningLevel: 'none',
      toolUseRequired: true,
      externalAccessRequired: false,
      localOnly: true,
      privacyLevel: 'local',
      multiStep: false,
    };

    const decision = await engine.decide(requirements);

    expect(decision.selectedProvider).toBe('android_actions');
    expect(decision.executionTarget).toBe('ANDROID_ACTION');
  });

  // 3. Gmail API Task: "Read my latest emails"
  test('routes email access to Gmail API', async () => {
    const requirements: TaskRequirements = {
      capabilities: ['EMAIL_ACCESS'],
      requiredCapabilities: ['EMAIL_ACCESS'],
      reasoningLevel: 'basic',
      toolUseRequired: true,
      externalAccessRequired: true,
      localOnly: false,
      privacyLevel: 'private',
      multiStep: false,
      requiresAuthentication: true,
    };

    const decision = await engine.decide(requirements);

    expect(decision.selectedProvider).toBe('gmail_api');
    expect(decision.executionTarget).toBe('API');
    expect(decision.requiresAuthentication).toBe(true);
  });

  // 4. Research Agent Task: "Research the latest AI agents"
  test('routes research task requiring fresh information to research agent', async () => {
    const requirements: TaskRequirements = {
      capabilities: ['RESEARCH', 'WEB_SEARCH'],
      requiredCapabilities: ['RESEARCH'],
      reasoningLevel: 'deep',
      toolUseRequired: true,
      externalAccessRequired: true,
      localOnly: false,
      privacyLevel: 'standard',
      multiStep: true,
      freshInformationRequired: true,
    };

    const decision = await engine.decide(requirements);

    expect(decision.selectedProvider).toBe('research_agent');
    expect(decision.executionTarget).toBe('MULTI_STEP');
  });

  // 5. Complex Reasoning: "Write a complex application architecture"
  test('routes deep coding and architecture task to cloud reasoning model', async () => {
    const requirements: TaskRequirements = {
      capabilities: ['CODING', 'DEEP_REASONING'],
      requiredCapabilities: ['CODING', 'DEEP_REASONING'],
      reasoningLevel: 'deep',
      toolUseRequired: false,
      externalAccessRequired: true,
      localOnly: false,
      privacyLevel: 'standard',
      multiStep: false,
    };

    const decision = await engine.decide(requirements);

    expect(decision.selectedProvider).toBe('cloud_frontier_model');
    expect(decision.executionTarget).toBe('EXTERNAL_MODEL');
  });

  // 6. Multi-Step Task: "Find meeting from email and open in Maps"
  test('routes composite multi-capability task to MULTI_STEP target', async () => {
    const requirements: TaskRequirements = {
      capabilities: ['EMAIL_ACCESS', 'APP_MANAGEMENT'],
      reasoningLevel: 'basic',
      toolUseRequired: true,
      externalAccessRequired: true,
      localOnly: false,
      privacyLevel: 'private',
      multiStep: true,
    };

    const decision = await engine.decide(requirements);

    expect(decision.executionTarget).toBe('MULTI_STEP');
  });

  // 7. Private Document: "Summarize this private document"
  test('prefers on-device local model when privacy is local', async () => {
    const requirements: TaskRequirements = {
      capabilities: ['SUMMARIZATION'],
      reasoningLevel: 'basic',
      toolUseRequired: false,
      externalAccessRequired: false,
      localOnly: true,
      privacyLevel: 'local',
      multiStep: false,
    };

    const decision = await engine.decide(requirements);

    expect(decision.selectedProvider).toBe('local');
    expect(decision.executionTarget).toBe('LOCAL');
  });

  // 8. Fallback provider selection
  test('identifies a secondary fallback provider if available', async () => {
    const requirements: TaskRequirements = {
      capabilities: ['TEXT_GENERATION'],
      reasoningLevel: 'basic',
      toolUseRequired: false,
      externalAccessRequired: true,
      localOnly: false,
      privacyLevel: 'standard',
      multiStep: false,
    };

    const decision = await engine.decide(requirements);

    expect(decision.selectedProvider).toBeDefined();
    expect(decision.fallbackProvider).toBeDefined();
    expect(decision.fallbackProvider).not.toBe(decision.selectedProvider);
  });
});
