/**
 * Tests for IntelligenceRouter.
 */

import { IntelligenceRouter } from '../core/external/routing/IntelligenceRouter';
import { TaskRequirementsAnalyzer } from '../core/external/routing/TaskRequirementsAnalyzer';
import { ExternalProviderRegistry } from '../core/external/providers/ExternalProviderRegistry';
import { AgentRegistry } from '../core/external/agents/AgentRegistry';
import { TaskUnderstandingService } from '../core/routing/TaskUnderstandingService';

describe('IntelligenceRouter', () => {
  let router: IntelligenceRouter;
  let requirementsAnalyzer: TaskRequirementsAnalyzer;
  let externalRegistry: ExternalProviderRegistry;
  let agentRegistry: AgentRegistry;
  let taskClassifier: TaskUnderstandingService;

  beforeEach(() => {
    requirementsAnalyzer = new TaskRequirementsAnalyzer();
    externalRegistry = new ExternalProviderRegistry();
    agentRegistry = new AgentRegistry();
    taskClassifier = new TaskUnderstandingService();

    router = new IntelligenceRouter(
      requirementsAnalyzer,
      externalRegistry,
      agentRegistry
    );
  });

  test('routes "Open YouTube" to ANDROID_ACTION', async () => {
    const input = 'Open YouTube';
    const intent = taskClassifier.classify(input);
    const decision = await router.route(input, intent);

    expect(decision.target).toBe('ANDROID_ACTION');
    expect(decision.requirements.capabilities).toContain('app.launch');
  });

  test('routes "Show my latest emails" to API', async () => {
    const input = 'Show my latest emails';
    const intent = taskClassifier.classify(input);
    const decision = await router.route(input, intent);

    expect(decision.target).toBe('API');
    expect(decision.requirements.capabilities).toContain('gmail.read_latest');
    expect(decision.requirements.privacyLevel).toBe('private');
  });

  test('routes "Research 30 companies and compare them" to EXTERNAL_AGENT', async () => {
    const input = 'Research 30 companies and compare them';
    const intent = taskClassifier.classify(input);
    const decision = await router.route(input, intent);

    expect(decision.target).toBe('EXTERNAL_AGENT');
    expect(decision.requirements.reasoningLevel).toBe('deep');
  });

  test('routes "Explain this complex paper" to EXTERNAL_MODEL', async () => {
    const input = 'Explain this complex paper';
    const intent = taskClassifier.classify(input);
    const decision = await router.route(input, intent);

    expect(decision.target).toBe('EXTERNAL_MODEL');
    expect(decision.requirements.reasoningLevel).toBe('advanced');
  });

  test('routes composite meeting request to MULTI_STEP', async () => {
    const input = 'Find meeting details from my email and open the location in Maps';
    const intent = taskClassifier.classify(input);
    const decision = await router.route(input, intent);

    expect(decision.target).toBe('MULTI_STEP');
    expect(decision.requirements.multiStep).toBe(true);
  });
});
