/**
 * Extended Intelligence Router for Saturday Phase 3.
 *
 * Expands Phase 1/2 routing to decide between:
 * - LOCAL: On-device model or local device queries (e.g. battery)
 * - ANDROID_ACTION: Native device / app automation (Phase 2)
 * - API: Direct external services (e.g. Gmail API)
 * - EXTERNAL_MODEL: Cloud AI models for advanced reasoning
 * - EXTERNAL_AGENT: Autonomous delegated agents (Research, Travel)
 * - MULTI_STEP: Composite flows bridging multiple targets
 */

import {
  ExtendedRoutingDecision,
  ExecutionTarget,
  TaskRequirements,
} from '../../types/external';
import { ExternalProviderRegistry } from '../providers/ExternalProviderRegistry';
import { AgentRegistry } from '../agents/AgentRegistry';
import { TaskRequirementsAnalyzer } from './TaskRequirementsAnalyzer';
import { TaskIntent } from '../../types/task';
import { LocalAIProvider } from '../../ai/LocalAIProvider';
import type { RoutingDecisionEngine } from '../../../intelligence/routing/RoutingDecisionEngine';

export class IntelligenceRouter {
  constructor(
    private requirementsAnalyzer: TaskRequirementsAnalyzer,
    private externalRegistry: ExternalProviderRegistry,
    private agentRegistry: AgentRegistry,
    private localProvider?: LocalAIProvider,
    private decisionEngine?: RoutingDecisionEngine
  ) {}

  /**
   * Decide execution strategy and target based on user input and intent.
   */
  async route(input: string, intent?: TaskIntent): Promise<ExtendedRoutingDecision> {
    const requirements = this.requirementsAnalyzer.analyze(input, intent);

    // Priority: Local Memory Operations
    if (
      intent?.type === 'MEMORY_QUERY' ||
      intent?.type === 'MEMORY_STORE' ||
      intent?.type === 'MEMORY_DELETE' ||
      intent?.type === 'MEMORY_LIST' ||
      intent?.type === 'MEMORY_UPDATE'
    ) {
      return {
        target: 'LOCAL',
        providerId: 'local',
        reason: 'Handled locally via Saturday Memory System for privacy and immediate response.',
        confidence: 1.0,
        requirements,
      };
    }

    // Phase 4: Dynamic Intelligence Selection via RoutingDecisionEngine
    if (this.decisionEngine) {
      const decision = await this.decisionEngine.decide(requirements);
      return {
        target: decision.executionTarget,
        providerId: decision.selectedProvider,
        agentId: decision.executionTarget === 'EXTERNAL_AGENT' ? decision.selectedProvider : undefined,
        reason: decision.explanation,
        confidence: decision.confidence,
        requirements,
      };
    }

    const primaryCap = requirements.capabilities[0] || 'general';

    // 1. External Agent Tasks (e.g. Deep research, travel booking)
    if (requirements.reasoningLevel === 'deep' || primaryCap.startsWith('agent.')) {
      const capableAgents = this.agentRegistry.findByCapabilities(
        requirements.capabilities.filter((c) => !c.startsWith('agent.'))
      );

      const agentId = capableAgents[0]?.id || 'research_agent';

      return {
        target: 'EXTERNAL_AGENT',
        agentId,
        reason: 'Task requires specialized autonomous research or multi-step external agent.',
        confidence: 0.85,
        requirements,
      };
    }

    // 2. Cross-System Multi-Step Tasks (e.g. "Find meeting from email and open in Maps")
    if (requirements.multiStep && requirements.capabilities.length > 1) {
      return {
        target: 'MULTI_STEP',
        reason: 'Task requires sequential multi-step execution across external APIs and device actions.',
        confidence: 0.9,
        requirements,
      };
    }

    // 3. Android Device & App Actions (Phase 2)
    if (
      primaryCap.startsWith('app.') ||
      primaryCap.startsWith('device.') ||
      primaryCap.startsWith('url.') ||
      primaryCap.startsWith('clipboard.') ||
      primaryCap.startsWith('phone.')
    ) {
      return {
        target: 'ANDROID_ACTION',
        reason: `Dispatched to local Android Action Engine for capability "${primaryCap}".`,
        confidence: 0.95,
        requirements,
      };
    }

    // 4. API Tasks (e.g. Gmail, Weather, Calendar)
    if (primaryCap.startsWith('gmail.') || primaryCap.startsWith('api.')) {
      return {
        target: 'API',
        reason: `Requires external API integration: ${primaryCap}.`,
        confidence: 0.9,
        requirements,
      };
    }

    // 5. External Cloud AI Model (e.g. advanced reasoning, complex document analysis)
    if (requirements.reasoningLevel === 'advanced') {
      const capableProviders = await this.externalRegistry.findByCapability('reasoning');
      const providerId = capableProviders[0]?.id || 'cloud_model';

      return {
        target: 'EXTERNAL_MODEL',
        providerId,
        reason: 'Task demands advanced reasoning exceeding on-device capabilities.',
        confidence: 0.8,
        requirements,
      };
    }

    // 5.5 Fresh Information / Current Data (e.g. latest news, real-time events)
    if (requirements.freshInformationRequired || requirements.requiresCurrentData) {
      const capableProviders = await this.externalRegistry.findByCapability('web_search');
      const providerId = capableProviders[0]?.id || 'external_news_provider';

      return {
        target: 'EXTERNAL_MODEL',
        providerId,
        reason: 'Task requires current data or fresh information exceeding local model knowledge.',
        confidence: 0.85,
        requirements,
      };
    }

    // 6. Local Model (Baseline default if local model runtime is active)
    const isLocalAvailable = this.localProvider ? await this.localProvider.isAvailable() : false;
    if (isLocalAvailable) {
      return {
        target: 'LOCAL',
        providerId: 'local',
        reason: 'Local on-device AI model is available.',
        confidence: 0.75,
        requirements,
      };
    }

    // Fallback: Default to external model or local
    return {
      target: 'LOCAL',
      reason: 'Default local routing.',
      confidence: 0.6,
      requirements,
    };
  }
}
