/**
 * Central Intelligence Registry for Saturday.
 *
 * Maintains the directory of all intelligence sources (local models,
 * cloud models, agents, APIs, and tools) along with their capabilities,
 * performance profiles, privacy characteristics, and lifecycle states.
 */

import {
  IntelligenceProviderEntry,
  IntelligenceProviderState,
  IntelligenceSourceType,
} from '../../core/types/intelligence';
import { TaskRequirements } from '../../core/types/external';
import {
  CAPABILITIES,
  calculateCapabilityCoverage,
  normalizeCapability,
} from './CapabilityTaxonomy';

export class IntelligenceRegistry {
  private providers: Map<string, IntelligenceProviderEntry> = new Map();

  constructor() {
    this.registerBuiltInProviders();
  }

  /**
   * Register a new provider entry or replace an existing one.
   */
  registerProvider(entry: IntelligenceProviderEntry): void {
    this.providers.set(entry.id, {
      ...entry,
      lastUpdated: Date.now(),
    });
  }

  /**
   * Partially update a provider entry.
   */
  updateProvider(id: string, updates: Partial<IntelligenceProviderEntry>): void {
    const existing = this.providers.get(id);
    if (!existing) return;

    this.providers.set(id, {
      ...existing,
      ...updates,
      lastUpdated: Date.now(),
    });
  }

  /**
   * Remove a provider from the registry.
   */
  removeProvider(id: string): void {
    this.providers.delete(id);
  }

  /**
   * Retrieve a provider by ID.
   */
  getProvider(id: string): IntelligenceProviderEntry | null {
    if (id === 'qwen-local' || id === 'qwen') {
      return this.providers.get('qwen-local') || this.providers.get('local') || null;
    }
    return this.providers.get(id) || null;
  }

  /**
   * Return all registered providers regardless of state.
   */
  getAllProviders(): IntelligenceProviderEntry[] {
    return Array.from(this.providers.values());
  }

  /**
   * Return all active or degraded (usable) providers.
   */
  getActiveProviders(): IntelligenceProviderEntry[] {
    return Array.from(this.providers.values()).filter(
      (p) => p.state === 'ACTIVE' || p.state === 'DEGRADED'
    );
  }

  /**
   * Find candidate providers that can satisfy at least one required capability.
   */
  findCandidates(requirements: TaskRequirements): IntelligenceProviderEntry[] {
    const active = this.getActiveProviders();
    const reqCaps = requirements.capabilities || [];

    if (reqCaps.length === 0) {
      return active;
    }

    return active.filter((provider) => {
      const provCaps = provider.capabilities.map((c) => c.id);
      const coverage = calculateCapabilityCoverage(reqCaps, provCaps);
      return coverage > 0;
    });
  }

  /**
   * Find providers offering a specific capability.
   */
  getProvidersByCapability(capability: string): IntelligenceProviderEntry[] {
    const normalized = normalizeCapability(capability);
    return this.getActiveProviders().filter((p) =>
      p.capabilities.some((c) => normalizeCapability(c.id) === normalized)
    );
  }

  /**
   * Find providers matching a specific type.
   */
  getProvidersByType(type: IntelligenceSourceType): IntelligenceProviderEntry[] {
    return this.getActiveProviders().filter((p) => p.type === type);
  }

  /**
   * Update the lifecycle state of a provider.
   */
  setProviderState(id: string, state: IntelligenceProviderState): void {
    const provider = this.providers.get(id);
    if (provider) {
      provider.state = state;
      provider.lastUpdated = Date.now();
    }
  }

  /**
   * Get the current state of a provider.
   */
  getProviderState(id: string): IntelligenceProviderState | null {
    return this.providers.get(id)?.state || null;
  }

  /**
   * Register an external provider with full intelligence metadata.
   */
  registerExternalProvider(config: {
    id: string;
    name: string;
    type: 'CLOUD_MODEL';
    capabilities: string[];
    costProfile: {
      inputCostPer1kTokens: number;
      outputCostPer1kTokens: number;
    };
    latencyProfile: {
      averageMs: number;
      p50Ms: number;
    };
    benchmarkScores: Record<string, number>;
  }): void {
    const now = Date.now();
    
    // Map capability strings to ProviderCapability objects
    const capabilities = config.capabilities.map((cap) => ({
      id: cap as any,
      category: this.inferCapabilityCategory(cap),
      score: 0.9,
    }));

    const entry: IntelligenceProviderEntry = {
      id: config.id,
      name: config.name,
      type: config.type,
      capabilities,
      inputTypes: ['text', 'json'],
      outputTypes: ['text', 'json'],
      reasoningLevel: 'deep',
      contextWindow: 128000,
      visionSupport: config.capabilities.includes('VISION'),
      codingSupport: config.capabilities.includes('CODING'),
      researchSupport: false,
      agenticSupport: false,
      supportsStreaming: true,
      supportsStructuredOutput: true,
      supportsFunctionCalling: config.capabilities.includes('FUNCTION_CALLING'),
      privacyProfile: {
        level: 'standard',
        dataRetentionPolicy: 'none',
        sendsDataExternally: true,
        storageLocation: 'cloud',
      },
      costProfile: {
        costTier: 'medium',
        inputCostPer1kTokens: config.costProfile.inputCostPer1kTokens,
        outputCostPer1kTokens: config.costProfile.outputCostPer1kTokens,
        currency: 'USD',
      },
      latencyProfile: {
        averageMs: config.latencyProfile.averageMs,
        p50Ms: config.latencyProfile.p50Ms,
        p95Ms: config.latencyProfile.p50Ms * 2,
        timeToFirstTokenMs: config.latencyProfile.p50Ms * 0.4,
      },
      reliabilityProfile: {
        successRate: 0.97,
        failureRate: 0.03,
        sampleSize: 100,
      },
      state: 'UNAVAILABLE', // External providers start unavailable until API key configured
      lastUpdated: now,
      source: 'external',
      version: '1.0.0',
    };

    this.registerProvider(entry);
  }

  /**
   * Get providers that match specific task requirements.
   */
  getProvidersByRequirement(requirements: TaskRequirements): IntelligenceProviderEntry[] {
    const active = this.getActiveProviders();
    const reqCaps = requirements.capabilities || [];

    if (reqCaps.length === 0) {
      return active;
    }

    return active.filter((provider) => {
      // Check capability match
      const provCaps = provider.capabilities.map((c) => normalizeCapability(c.id));
      const hasRequiredCaps = reqCaps.every((reqCap) =>
        provCaps.some((provCap) => provCap === normalizeCapability(reqCap))
      );

      if (!hasRequiredCaps) return false;

      // Check reasoning level match
      const reasoningLevels = ['none', 'basic', 'advanced', 'deep'];
      const reqLevel = reasoningLevels.indexOf(requirements.reasoningLevel);
      const provLevel = reasoningLevels.indexOf(provider.reasoningLevel);
      if (provLevel < reqLevel) return false;

      return true;
    });
  }

  /**
   * Infer capability category from capability ID.
   */
  private inferCapabilityCategory(capability: string): any {
    const categoryMap: Record<string, string> = {
      TEXT_GENERATION: 'generation',
      REASONING: 'reasoning',
      DEEP_REASONING: 'reasoning',
      CODING: 'coding',
      DEBUGGING: 'coding',
      VISION: 'media',
      FUNCTION_CALLING: 'tools',
      STRUCTURED_OUTPUT: 'generation',
      LONG_CONTEXT: 'generation',
    };
    return categoryMap[capability] || 'generation';
  }

  /**
   * Pre-populate default built-in providers for Saturday.
   */
  private registerBuiltInProviders(): void {
    const now = Date.now();

    // 1. Local On-Device AI Model (Default Qwen 2.5 0.5B)
    this.registerProvider({
      id: 'local',
      name: 'On-Device AI Model',
      type: 'LOCAL_MODEL',
      capabilities: [
        { id: CAPABILITIES.TEXT_GENERATION, category: 'generation', score: 0.85 },
        { id: CAPABILITIES.REASONING, category: 'reasoning', score: 0.8 },
        { id: CAPABILITIES.SUMMARIZATION, category: 'generation', score: 0.8 },
        { id: CAPABILITIES.PRIVATE_DATA_PROCESSING, category: 'privacy', score: 1.0 },
      ],
      inputTypes: ['text'],
      outputTypes: ['text'],
      reasoningLevel: 'basic',
      contextWindow: 4096,
      visionSupport: false,
      codingSupport: true,
      researchSupport: false,
      agenticSupport: false,
      supportsStreaming: true,
      supportsStructuredOutput: true,
      supportsFunctionCalling: false,
      privacyProfile: {
        level: 'local',
        dataRetentionPolicy: 'none',
        sendsDataExternally: false,
        storageLocation: 'device',
      },
      costProfile: {
        costTier: 'free',
        inputCostPer1kTokens: 0,
        outputCostPer1kTokens: 0,
        currency: 'USD',
      },
      latencyProfile: {
        averageMs: 150,
        p50Ms: 120,
        p95Ms: 300,
        timeToFirstTokenMs: 80,
      },
      reliabilityProfile: {
        successRate: 0.99,
        failureRate: 0.01,
        sampleSize: 100,
      },
      state: 'ACTIVE',
      lastUpdated: now,
      source: 'built-in',
      version: '1.0.0',
    });

    // 2. Android Action Engine & System Tools
    this.registerProvider({
      id: 'android_actions',
      name: 'Android Action Engine',
      type: 'TOOL',
      capabilities: [
        { id: CAPABILITIES.ANDROID_CONTROL, category: 'device', score: 1.0 },
        { id: CAPABILITIES.APP_MANAGEMENT, category: 'device', score: 1.0 },
        { id: CAPABILITIES.MEDIA_PLAYBACK, category: 'device', score: 1.0 },
        { id: CAPABILITIES.DEVICE_INFO, category: 'device', score: 1.0 },
        { id: CAPABILITIES.TOOL_USE, category: 'tools', score: 1.0 },
      ],
      inputTypes: ['action_intent'],
      outputTypes: ['action_result'],
      reasoningLevel: 'none',
      contextWindow: 0,
      visionSupport: false,
      codingSupport: false,
      researchSupport: false,
      agenticSupport: false,
      supportsStreaming: false,
      supportsStructuredOutput: true,
      supportsFunctionCalling: true,
      privacyProfile: {
        level: 'local',
        dataRetentionPolicy: 'none',
        sendsDataExternally: false,
        storageLocation: 'device',
      },
      costProfile: {
        costTier: 'free',
        inputCostPer1kTokens: 0,
        outputCostPer1kTokens: 0,
      },
      latencyProfile: {
        averageMs: 50,
        p50Ms: 40,
        p95Ms: 100,
      },
      reliabilityProfile: {
        successRate: 0.98,
        failureRate: 0.02,
        sampleSize: 200,
      },
      state: 'ACTIVE',
      lastUpdated: now,
      source: 'built-in',
      version: '1.0.0',
    });

    // 3. Gmail API Provider
    this.registerProvider({
      id: 'gmail_api',
      name: 'Gmail Service API',
      type: 'API',
      capabilities: [
        { id: CAPABILITIES.EMAIL_ACCESS, category: 'communication', score: 0.95 },
        { id: CAPABILITIES.TOOL_USE, category: 'tools', score: 0.9 },
      ],
      inputTypes: ['query', 'json'],
      outputTypes: ['email_list', 'email_content'],
      reasoningLevel: 'none',
      contextWindow: 0,
      visionSupport: false,
      codingSupport: false,
      researchSupport: false,
      agenticSupport: false,
      supportsStreaming: false,
      supportsStructuredOutput: true,
      supportsFunctionCalling: true,
      privacyProfile: {
        level: 'private',
        dataRetentionPolicy: 'none',
        sendsDataExternally: true,
        storageLocation: 'cloud',
      },
      costProfile: {
        costTier: 'free',
      },
      latencyProfile: {
        averageMs: 600,
        p50Ms: 500,
        p95Ms: 1200,
      },
      reliabilityProfile: {
        successRate: 0.95,
        failureRate: 0.05,
        sampleSize: 50,
      },
      state: 'ACTIVE',
      lastUpdated: now,
      source: 'built-in',
      version: '1.0.0',
    });

    // 4. Research & Deep Reasoning Agent
    this.registerProvider({
      id: 'research_agent',
      name: 'Autonomous Research Agent',
      type: 'AGENT',
      capabilities: [
        { id: CAPABILITIES.RESEARCH, category: 'research', score: 0.92 },
        { id: CAPABILITIES.WEB_SEARCH, category: 'research', score: 0.95 },
        { id: CAPABILITIES.WEB_BROWSING, category: 'research', score: 0.88 },
        { id: CAPABILITIES.DEEP_REASONING, category: 'reasoning', score: 0.9 },
        { id: CAPABILITIES.AGENTIC_EXECUTION, category: 'tools', score: 0.95 },
        { id: CAPABILITIES.MULTI_STEP_EXECUTION, category: 'tools', score: 0.9 },
      ],
      inputTypes: ['text', 'agent_task'],
      outputTypes: ['agent_response', 'research_report'],
      reasoningLevel: 'deep',
      contextWindow: 128000,
      visionSupport: true,
      codingSupport: true,
      researchSupport: true,
      agenticSupport: true,
      supportsStreaming: true,
      supportsStructuredOutput: true,
      supportsFunctionCalling: true,
      privacyProfile: {
        level: 'standard',
        dataRetentionPolicy: 'session',
        sendsDataExternally: true,
        storageLocation: 'cloud',
      },
      costProfile: {
        costTier: 'medium',
        inputCostPer1kTokens: 0.003,
        outputCostPer1kTokens: 0.015,
        currency: 'USD',
      },
      latencyProfile: {
        averageMs: 3500,
        p50Ms: 2800,
        p95Ms: 8000,
        timeToFirstTokenMs: 900,
      },
      reliabilityProfile: {
        successRate: 0.92,
        failureRate: 0.08,
        sampleSize: 80,
      },
      state: 'ACTIVE',
      lastUpdated: now,
      source: 'built-in',
      version: '1.0.0',
    });

    // 5. Cloud Frontier Reasoning Model
    this.registerProvider({
      id: 'cloud_frontier_model',
      name: 'Frontier Cloud Reasoning Model',
      type: 'CLOUD_MODEL',
      capabilities: [
        { id: CAPABILITIES.TEXT_GENERATION, category: 'generation', score: 0.98 },
        { id: CAPABILITIES.REASONING, category: 'reasoning', score: 0.97 },
        { id: CAPABILITIES.DEEP_REASONING, category: 'reasoning', score: 0.96 },
        { id: CAPABILITIES.CODING, category: 'coding', score: 0.95 },
        { id: CAPABILITIES.DEBUGGING, category: 'coding', score: 0.94 },
        { id: CAPABILITIES.DOCUMENT_ANALYSIS, category: 'services', score: 0.95 },
      ],
      inputTypes: ['text', 'json'],
      outputTypes: ['text', 'json'],
      reasoningLevel: 'deep',
      contextWindow: 200000,
      visionSupport: true,
      codingSupport: true,
      researchSupport: false,
      agenticSupport: false,
      supportsStreaming: true,
      supportsStructuredOutput: true,
      supportsFunctionCalling: true,
      privacyProfile: {
        level: 'standard',
        dataRetentionPolicy: 'none',
        sendsDataExternally: true,
        storageLocation: 'cloud',
      },
      costProfile: {
        costTier: 'medium',
        inputCostPer1kTokens: 0.0025,
        outputCostPer1kTokens: 0.01,
        currency: 'USD',
      },
      latencyProfile: {
        averageMs: 1200,
        p50Ms: 1000,
        p95Ms: 2500,
        timeToFirstTokenMs: 400,
      },
      reliabilityProfile: {
        successRate: 0.97,
        failureRate: 0.03,
        sampleSize: 120,
      },
      state: 'ACTIVE',
      lastUpdated: now,
      source: 'built-in',
      version: '1.0.0',
    });

    // 6. OpenAI (GPT-4o)
    this.registerExternalProvider({
      id: 'openai_provider',
      name: 'OpenAI GPT-4o',
      type: 'CLOUD_MODEL',
      capabilities: ['TEXT_GENERATION', 'REASONING', 'DEEP_REASONING', 'CODING', 'VISION', 'FUNCTION_CALLING', 'STRUCTURED_OUTPUT'],
      costProfile: {
        inputCostPer1kTokens: 0.0025,
        outputCostPer1kTokens: 0.01,
      },
      latencyProfile: {
        averageMs: 1200,
        p50Ms: 1000,
      },
      benchmarkScores: {
        MMLU: 88.7,
        HumanEval: 90.2,
      },
    });

    // 7. Anthropic Claude 3.5 Sonnet
    this.registerExternalProvider({
      id: 'anthropic_provider',
      name: 'Anthropic Claude 3.5 Sonnet',
      type: 'CLOUD_MODEL',
      capabilities: ['TEXT_GENERATION', 'REASONING', 'DEEP_REASONING', 'CODING', 'VISION', 'LONG_CONTEXT'],
      costProfile: {
        inputCostPer1kTokens: 0.003,
        outputCostPer1kTokens: 0.015,
      },
      latencyProfile: {
        averageMs: 1400,
        p50Ms: 1100,
      },
      benchmarkScores: {
        MMLU: 88.3,
        HumanEval: 92.0,
      },
    });

    // 8. Google Gemini 1.5 Pro
    this.registerExternalProvider({
      id: 'google_gemini_provider',
      name: 'Google Gemini 1.5 Pro',
      type: 'CLOUD_MODEL',
      capabilities: ['TEXT_GENERATION', 'REASONING', 'CODING', 'VISION', 'LONG_CONTEXT'],
      costProfile: {
        inputCostPer1kTokens: 0.00125,
        outputCostPer1kTokens: 0.005,
      },
      latencyProfile: {
        averageMs: 1300,
        p50Ms: 1050,
      },
      benchmarkScores: {
        MMLU: 85.9,
        HumanEval: 84.1,
      },
    });
  }
}
