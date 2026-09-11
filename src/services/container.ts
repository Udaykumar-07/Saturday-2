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

import { MemoryService } from './MemoryService';
import { PersonalityService } from './PersonalityService';
import { ConversationService } from './ConversationService';
import { AIService } from './AIService';

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
    this.localProvider = new LocalAIProvider();
    // Default mock provider enabled for local dev/testing
    this.mockProvider = new MockAIProvider(true);

    this.aiRegistry.register(this.localProvider);
    this.aiRegistry.register(this.mockProvider);

    // 4. Routing
    this.router = new AIRouter(this.aiRegistry);

    // 5. Context Providers
    this.contextService = new ContextService();
    this.contextService.registerProvider(new MemoryContextProvider(this.memoryService));
    this.contextService.registerProvider(new DeviceContextProvider());

    // 6. Orchestration Services
    this.conversationService = new ConversationService(
      this.conversationRepo,
      this.aiRegistry,
      this.router,
      this.contextService,
      this.personalityService
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
