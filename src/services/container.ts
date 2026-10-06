/**
 * Dependency container for Saturday.
 * Provides singleton instances of repositories, providers, and services.
 * Keeps UI components completely decoupled from service construction.
 */

import { AsyncStorageAdapter } from '../storage/AsyncStorageAdapter';
import { ConversationRepository } from '../storage/ConversationRepository';
import { MemoryRepository } from '../storage/MemoryRepository';
import { PersonalityRepository } from '../storage/PersonalityRepository';
import { SettingsRepository } from '../storage/SettingsRepository';

import { AIProviderRegistry } from '../core/ai/AIProviderRegistry';
import { LocalAIProvider } from '../core/ai/LocalAIProvider';
import { MockAIProvider } from '../core/ai/MockAIProvider';

import { AIRouter } from '../core/routing/AIRouter';
import { TaskUnderstandingService } from '../core/routing/TaskUnderstandingService';

import { ContextService } from '../core/context/ContextService';
import { MemoryContextProvider } from '../core/context/MemoryContextProvider';
import { DeviceContextProvider } from '../core/context/DeviceContextProvider';

import {
  LocalModelStorage,
  ModelDownloadManager,
  LocalAIReadinessService,
  QwenOrchestrator,
} from '../core/ai/qwen';

import {
  LayaRuntime,
  LayaModelManager,
  LayaIntentClassifier,
} from '../core/ai/laya';

import { MemoryService } from './MemoryService';
import { PersonalityService } from './PersonalityService';
import { ConversationService } from './ConversationService';
import { AIService } from './AIService';
import { ActionService } from './ActionService';
import { LocalAIService } from './LocalAIService';


import { ActionEngine } from '../core/actions/ActionEngine';
import { CapabilityRegistry } from '../core/actions/CapabilityRegistry';
import { registerAllCapabilities } from '../capabilities';

import { CredentialStore } from '../core/external/authentication/CredentialStore';
import { AuthenticationManager } from '../core/external/authentication/AuthenticationManager';
import { ExternalProviderRegistry } from '../core/external/providers/ExternalProviderRegistry';
import { OpenAIProvider } from '../core/external/providers/OpenAIProvider';
import { AnthropicProvider } from '../core/external/providers/AnthropicProvider';
import { GoogleGeminiProvider } from '../core/external/providers/GoogleGeminiProvider';
import { AgentRegistry } from '../core/external/agents/AgentRegistry';
import { AgentClient } from '../core/external/agents/AgentClient';
import { AgentCommunicationLayer } from '../core/external/agents/AgentCommunicationLayer';
import { DataBoundaryManager } from '../core/external/execution/DataBoundaryManager';
import { ExternalResultVerifier } from '../core/external/execution/ExternalResultVerifier';
import { ProviderHealthTracker } from '../core/external/health/ProviderHealthTracker';
import { TaskRequirementsAnalyzer } from '../core/external/routing/TaskRequirementsAnalyzer';
import { IntelligenceRouter } from '../core/external/routing/IntelligenceRouter';
import { ExternalTaskExecutor } from '../core/external/execution/ExternalTaskExecutor';
import { GmailAuth } from '../core/external/services/gmail/GmailAuth';
import { GmailProvider } from '../core/external/services/gmail/GmailProvider';
import {
  GmailReadLatestCapability,
  GmailSearchCapability,
} from '../core/external/services/gmail/GmailCapability';
import { ExternalService } from './ExternalService';
import { IntegrationService } from './IntegrationService';
import {
  IntelligenceRegistry,
  BenchmarkStore,
  SaturdayEvaluationEngine,
  LatencyTracker,
  CostEstimator,
  PrivacyRouter,
  RoutingFeedbackService,
  IntelligenceCache,
  IntelligenceDiscoveryService,
  BuiltInProviderAdapter,
  IntelligenceRepository,
  IntelligenceUpdateService,
  IntelligenceRefreshScheduler,
  HardConstraintFilter,
  RoutingScorer,
  ProviderEvaluationService,
  RoutingDecisionEngine,
} from '../intelligence';

export class ServiceContainer {
  private static instance: ServiceContainer | null = null;

  // Storage
  readonly storageAdapter: AsyncStorageAdapter;
  readonly conversationRepo: ConversationRepository;
  readonly memoryRepo: MemoryRepository;
  readonly personalityRepo: PersonalityRepository;
  readonly settingsRepo: SettingsRepository;

  // AI & Routing
  readonly aiRegistry: AIProviderRegistry;
  readonly localProvider: LocalAIProvider;
  readonly mockProvider: MockAIProvider;
  readonly router: AIRouter;
  readonly taskUnderstanding: TaskUnderstandingService;

  // Context
  readonly contextService: ContextService;

  // Domain Services
  readonly memoryService: MemoryService;
  readonly personalityService: PersonalityService;
  readonly conversationService: ConversationService;
  readonly aiService: AIService;
  readonly localAIService: LocalAIService;

  // Local AI Model Lifecycle & Orchestration
  readonly modelStorage: LocalModelStorage;
  readonly modelDownloadManager: ModelDownloadManager;
  readonly modelReadinessService: LocalAIReadinessService;
  readonly qwenOrchestrator: QwenOrchestrator;

  // Laya On-Device Intent Classification
  readonly layaRuntime: LayaRuntime;
  readonly layaModelManager: LayaModelManager;
  readonly layaClassifier: LayaIntentClassifier;

  // Action Engine (Phase 2)
  readonly capabilityRegistry: CapabilityRegistry;
  readonly actionEngine: ActionEngine;
  readonly actionService: ActionService;

  // External Intelligence & Auth (Phase 3)
  readonly credentialStore: CredentialStore;
  readonly authManager: AuthenticationManager;
  readonly externalRegistry: ExternalProviderRegistry;
  readonly openAIProvider: OpenAIProvider;
  readonly anthropicProvider: AnthropicProvider;
  readonly googleGeminiProvider: GoogleGeminiProvider;
  readonly agentRegistry: AgentRegistry;
  readonly agentClient: AgentClient;
  readonly agentLayer: AgentCommunicationLayer;
  readonly dataBoundary: DataBoundaryManager;
  readonly verifier: ExternalResultVerifier;
  readonly healthTracker: ProviderHealthTracker;
  readonly requirementsAnalyzer: TaskRequirementsAnalyzer;
  readonly intelligenceRouter: IntelligenceRouter;
  readonly externalExecutor: ExternalTaskExecutor;
  readonly externalService: ExternalService;
  readonly integrationService: IntegrationService;
  readonly gmailAuth: GmailAuth;
  readonly gmailProvider: GmailProvider;

  // Intelligence System (Phase 4)
  readonly intelligenceRegistry: IntelligenceRegistry;
  readonly benchmarkStore: BenchmarkStore;
  readonly evaluationEngine: SaturdayEvaluationEngine;
  readonly latencyTracker: LatencyTracker;
  readonly costEstimator: CostEstimator;
  readonly privacyRouter: PrivacyRouter;
  readonly routingFeedback: RoutingFeedbackService;
  readonly intelligenceCache: IntelligenceCache;
  readonly discoveryService: IntelligenceDiscoveryService;
  readonly intelligenceRepo: IntelligenceRepository;
  readonly updateService: IntelligenceUpdateService;
  readonly refreshScheduler: IntelligenceRefreshScheduler;
  readonly hardConstraintFilter: HardConstraintFilter;
  readonly routingScorer: RoutingScorer;
  readonly providerEvaluation: ProviderEvaluationService;
  readonly decisionEngine: RoutingDecisionEngine;

  private constructor() {
    // 1. Storage
    this.storageAdapter = new AsyncStorageAdapter();
    this.conversationRepo = new ConversationRepository(this.storageAdapter);
    this.memoryRepo = new MemoryRepository(this.storageAdapter);
    this.personalityRepo = new PersonalityRepository(this.storageAdapter);
    this.settingsRepo = new SettingsRepository(this.storageAdapter);

    // 2. Services needed early
    this.memoryService = new MemoryService(this.memoryRepo);
    this.personalityService = new PersonalityService(this.personalityRepo);
    this.taskUnderstanding = new TaskUnderstandingService();

    // 3. AI Providers & Registry
    this.aiRegistry = new AIProviderRegistry();
    this.localProvider = new LocalAIProvider({ enabled: true });
    this.localAIService = new LocalAIService(this.localProvider, this.settingsRepo);
    this.localAIService.initialize().catch(() => {});
    this.localProvider.initializeQwen().catch(() => {});
    // Mock provider retained as fallback if local AI is explicitly disabled
    this.mockProvider = new MockAIProvider(true);

    this.aiRegistry.register(this.localProvider);
    this.aiRegistry.register(this.localProvider.getQwenProvider());
    this.aiRegistry.register(this.mockProvider);

    // 4. Routing
    this.router = new AIRouter(this.aiRegistry);

    // 5. Context Providers
    this.contextService = new ContextService();
    this.contextService.registerProvider(new MemoryContextProvider(this.memoryService));
    this.contextService.registerProvider(new DeviceContextProvider());

    // 6. Action Engine (Phase 2)
    this.capabilityRegistry = new CapabilityRegistry();
    registerAllCapabilities(this.capabilityRegistry);
    this.actionEngine = new ActionEngine(this.capabilityRegistry);
    this.actionService = new ActionService(this.actionEngine);

    // 7. External Intelligence & APIs (Phase 3)
    this.credentialStore = new CredentialStore();
    this.authManager = new AuthenticationManager(this.credentialStore);
    this.externalRegistry = new ExternalProviderRegistry();
    
    // Instantiate and register external AI providers
    this.openAIProvider = new OpenAIProvider(this.credentialStore);
    this.anthropicProvider = new AnthropicProvider(this.credentialStore);
    this.googleGeminiProvider = new GoogleGeminiProvider(this.credentialStore);
    this.externalRegistry.register(this.openAIProvider);
    this.externalRegistry.register(this.anthropicProvider);
    this.externalRegistry.register(this.googleGeminiProvider);
    this.agentRegistry = new AgentRegistry();
    this.agentClient = new AgentClient();
    this.agentLayer = new AgentCommunicationLayer(
      this.agentRegistry,
      this.agentClient,
      this.authManager
    );
    this.dataBoundary = new DataBoundaryManager();
    this.verifier = new ExternalResultVerifier();
    this.healthTracker = new ProviderHealthTracker();
    this.requirementsAnalyzer = new TaskRequirementsAnalyzer();

    // 8. Phase 4 Dynamic Intelligence Selection System
    this.intelligenceRegistry = new IntelligenceRegistry();
    this.benchmarkStore = new BenchmarkStore();
    this.evaluationEngine = new SaturdayEvaluationEngine();
    this.latencyTracker = new LatencyTracker();
    this.costEstimator = new CostEstimator();
    this.privacyRouter = new PrivacyRouter();
    this.routingFeedback = new RoutingFeedbackService();
    this.intelligenceCache = new IntelligenceCache();
    this.discoveryService = new IntelligenceDiscoveryService(this.intelligenceRegistry);
    this.discoveryService.registerAdapter(new BuiltInProviderAdapter());
    this.intelligenceRepo = new IntelligenceRepository(this.settingsRepo);
    this.updateService = new IntelligenceUpdateService(
      this.intelligenceRegistry,
      this.discoveryService,
      this.benchmarkStore,
      this.intelligenceCache
    );
    this.refreshScheduler = new IntelligenceRefreshScheduler(
      this.updateService,
      this.intelligenceCache
    );
    this.hardConstraintFilter = new HardConstraintFilter(
      this.privacyRouter,
      this.costEstimator,
      this.authManager
    );
    this.routingScorer = new RoutingScorer();
    this.providerEvaluation = new ProviderEvaluationService(
      this.benchmarkStore,
      this.evaluationEngine,
      this.latencyTracker,
      this.costEstimator,
      this.privacyRouter,
      this.routingFeedback,
      this.routingScorer
    );
    this.decisionEngine = new RoutingDecisionEngine(
      this.intelligenceRegistry,
      this.hardConstraintFilter,
      this.providerEvaluation,
      this.benchmarkStore
    );

    this.intelligenceRouter = new IntelligenceRouter(
      this.requirementsAnalyzer,
      this.externalRegistry,
      this.agentRegistry,
      this.localProvider,
      this.decisionEngine
    );
    this.externalExecutor = new ExternalTaskExecutor(
      this.externalRegistry,
      this.agentLayer,
      this.authManager,
      this.dataBoundary,
      this.verifier,
      this.healthTracker
    );
    this.externalService = new ExternalService(
      this.intelligenceRouter,
      this.externalExecutor,
      this.actionService
    );
    this.integrationService = new IntegrationService(this.authManager);

    // Register Gmail integration
    this.gmailAuth = new GmailAuth();
    this.authManager.registerProvider(this.gmailAuth);
    this.gmailProvider = new GmailProvider(this.authManager);
    this.externalRegistry.register(this.gmailProvider);

    // Register Gmail capabilities in Phase 2 CapabilityRegistry
    this.capabilityRegistry.register(new GmailReadLatestCapability(this.gmailProvider));
    this.capabilityRegistry.register(new GmailSearchCapability(this.gmailProvider));

    // 8. Local AI Model Lifecycle & Orchestration
    this.modelStorage = new LocalModelStorage();
    const qwenRuntime = this.localProvider.getQwenProvider().getRuntime();
    this.modelDownloadManager = new ModelDownloadManager(this.modelStorage, qwenRuntime);
    this.modelReadinessService = new LocalAIReadinessService(
      this.modelStorage,
      this.modelDownloadManager,
      qwenRuntime
    );
    this.qwenOrchestrator = new QwenOrchestrator(
      qwenRuntime,
      this.memoryService,
      this.personalityService,
      this.actionService,
      this.externalService
    );

    // 8b. Laya On-Device Intent Classification
    this.layaRuntime = new LayaRuntime();
    this.layaModelManager = new LayaModelManager();
    this.layaClassifier = new LayaIntentClassifier(this.layaRuntime);
    this.taskUnderstanding.setLayaClassifier(this.layaClassifier);

    // Auto-load Laya model if already downloaded (non-blocking)
    this.layaModelManager.isInstalled().then(async (installed) => {
      if (installed) {
        try {
          await this.layaModelManager.loadRuntime(this.layaRuntime);
          console.log('[Saturday] Laya ONNX model successfully loaded and active');
        } catch (error) {
          console.warn('[Saturday] Failed to auto-load Laya ONNX runtime:', error);
        }
      } else {
        console.log('[Saturday] Laya model not installed. Download via Settings to enable ML classification.');
      }
    }).catch(() => {});

    // 9. Orchestration Services
    this.conversationService = new ConversationService(
      this.conversationRepo,
      this.aiRegistry,
      this.router,
      this.contextService,
      this.personalityService,
      this.taskUnderstanding,
      this.actionService,
      this.externalService,
      this.memoryService
    );

    this.aiService = new AIService(
      this.aiRegistry,
      this.router,
      this.contextService
    );
  }

  /**
   * Get the singleton service container.
   */
  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Reset container instance (primarily for testing).
   */
  static resetInstance(): void {
    ServiceContainer.instance = null;
  }
}

/**
 * Helper hook / accessor to get the default container instance.
 */
export const getServices = (): ServiceContainer => ServiceContainer.getInstance();
