import { ConversationService } from '../src/services/ConversationService';
import { ConversationRepository } from '../src/storage/ConversationRepository';
import { PersonalityRepository } from '../src/storage/PersonalityRepository';
import { PersonalityService } from '../src/services/PersonalityService';
import { AIProviderRegistry } from '../src/core/ai/AIProviderRegistry';
import { AIRouter } from '../src/core/routing/AIRouter';
import { ContextService } from '../src/core/context/ContextService';
import { MockAIProvider } from '../src/core/ai/MockAIProvider';
import { LocalAIProvider } from '../src/core/ai/LocalAIProvider';
import { FailingAIProvider } from '../src/core/ai/FailingAIProvider';
import { StorageAdapter } from '../src/storage/StorageAdapter';
import { AIProvider, AIRequest, AIResponse, IntelligenceCapability } from '../src/core/types/ai';
import { ActionEngine } from '../src/core/actions/ActionEngine';
import { CapabilityRegistry } from '../src/core/actions/CapabilityRegistry';
import { registerAllCapabilities } from '../src/capabilities';
import { ActionService } from '../src/services/ActionService';
import { Platform } from 'react-native';

class MemoryStorageAdapter implements StorageAdapter {
  private store: Map<string, string> = new Map();
  async get(key: string) { return this.store.get(key) ?? null; }
  async set(key: string, value: string) { this.store.set(key, value); }
  async remove(key: string) { this.store.delete(key); }
  async getAllKeys() { return Array.from(this.store.keys()); }
  async multiGet(keys: string[]) {
    const res: Record<string, string | null> = {};
    for (const key of keys) res[key] = this.store.get(key) ?? null;
    return res;
  }
  async multiSet(entries: Array<[string, string]>) {
    for (const [k, v] of entries) this.store.set(k, v);
  }
  async clear() { this.store.clear(); }
}

// Provider that returns malformed response (null content)
class MalformedAIProvider implements AIProvider {
  readonly id = 'malformed';
  readonly name = 'Malformed Provider';
  readonly type = 'local_model' as const;
  async isAvailable() { return true; }
  async generate(_req: AIRequest): Promise<AIResponse> {
    return { content: null as unknown as string, providerId: this.id };
  }
  getCapabilities(): IntelligenceCapability[] { return []; }
}

describe('ConversationService Orchestration', () => {
  let storage: MemoryStorageAdapter;
  let convRepo: ConversationRepository;
  let persRepo: PersonalityRepository;
  let persService: PersonalityService;
  let registry: AIProviderRegistry;
  let router: AIRouter;
  let contextService: ContextService;
  let service: ConversationService;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
    convRepo = new ConversationRepository(storage);
    persRepo = new PersonalityRepository(storage);
    persService = new PersonalityService(persRepo);
    registry = new AIProviderRegistry();
    router = new AIRouter(registry);
    contextService = new ContextService();

    service = new ConversationService(
      convRepo,
      registry,
      router,
      contextService,
      persService
    );
  });

  test('creates conversation and sends message with response', async () => {
    registry.register(new MockAIProvider(true));

    const conv = await service.create();
    expect(conv.messages).toHaveLength(0);

    const { userMessage, assistantMessage } = await service.sendMessage(
      conv.id,
      'Hello Saturday'
    );

    expect(userMessage.role).toBe('user');
    expect(userMessage.content).toBe('Hello Saturday');
    expect(assistantMessage.role).toBe('assistant');
    expect(assistantMessage.content).toBeDefined();

    // Verify conversation reloaded from repository
    const loaded = await service.load(conv.id);
    expect(loaded?.messages).toHaveLength(2);
    expect(loaded?.title).toBe('Hello Saturday');
  });

  test('handles provider unavailable gracefully without unhandled exceptions', async () => {
    // Only local provider which is unavailable
    registry.register(new LocalAIProvider());

    const conv = await service.create();
    const { assistantMessage } = await service.sendMessage(conv.id, 'Help me');

    // Rather than crashing, assistant receives a clear and helpful error notice
    expect(assistantMessage.role).toBe('assistant');
    expect(assistantMessage.content).toContain("don't have an AI model available right now");
  });

  test('handles malformed AI response gracefully', async () => {
    registry.register(new MalformedAIProvider());

    const conv = await service.create();
    const { assistantMessage } = await service.sendMessage(conv.id, 'Test malformed');

    expect(assistantMessage.role).toBe('assistant');
    expect(assistantMessage.content).toContain('received an unexpected response');
  });

  test('handles failing AI provider gracefully', async () => {
    registry.register(new FailingAIProvider('Simulated crash', true));

    const conv = await service.create();
    const { assistantMessage } = await service.sendMessage(conv.id, 'Crash test');

    expect(assistantMessage.role).toBe('assistant');
    expect(assistantMessage.content).toBeDefined();
  });

  test('executes "Search Imagine Dragons on YouTube" via ActionEngine instead of mock AI', async () => {
    const origPlatform = Platform.OS;
    (Platform as any).OS = 'android';
    try {
      const capRegistry = new CapabilityRegistry();
      registerAllCapabilities(capRegistry);
      const actionEngine = new ActionEngine(capRegistry);
      const actionService = new ActionService(actionEngine);

      const actionAwareService = new ConversationService(
        convRepo,
        registry,
        router,
        contextService,
        persService,
        undefined,
        actionService
      );

      const conv = await actionAwareService.create();
      const { assistantMessage } = await actionAwareService.sendMessage(
        conv.id,
        'Search Imagine Dragons on YouTube'
      );

      expect(assistantMessage.role).toBe('assistant');
      expect(assistantMessage.metadata?.providerId).toBe('action-engine');
      expect(assistantMessage.content).toContain('Search Imagine Dragons on YouTube');
      expect(assistantMessage.content).not.toContain('mock AI provider');
    } finally {
      (Platform as any).OS = origPlatform;
    }
  });

  test('executes "Search quantum computing on Chrome" via ActionEngine instead of mock AI', async () => {
    const origPlatform = Platform.OS;
    (Platform as any).OS = 'android';
    try {
      const capRegistry = new CapabilityRegistry();
      registerAllCapabilities(capRegistry);
      const actionEngine = new ActionEngine(capRegistry);
      const actionService = new ActionService(actionEngine);

      const actionAwareService = new ConversationService(
        convRepo,
        registry,
        router,
        contextService,
        persService,
        undefined,
        actionService
      );

      const conv = await actionAwareService.create();
      const { assistantMessage } = await actionAwareService.sendMessage(
        conv.id,
        'Search quantum computing on Chrome'
      );

      expect(assistantMessage.role).toBe('assistant');
      expect(assistantMessage.metadata?.providerId).toBe('action-engine');
      expect(assistantMessage.content).toContain('Search quantum computing on Chrome');
      expect(assistantMessage.content).not.toContain('mock AI provider');
    } finally {
      (Platform as any).OS = origPlatform;
    }
  });
});

