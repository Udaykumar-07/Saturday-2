import { AIRouter } from '../src/core/routing/AIRouter';
import { TaskUnderstandingService } from '../src/core/routing/TaskUnderstandingService';
import { AIProviderRegistry } from '../src/core/ai/AIProviderRegistry';
import { LocalAIProvider } from '../src/core/ai/LocalAIProvider';
import { MockAIProvider } from '../src/core/ai/MockAIProvider';
import { RoutingError } from '../src/core/types/errors';
import { AIProvider, AIRequest, AIResponse, IntelligenceCapability } from '../src/core/types/ai';

// Custom test provider simulating an active local model
class AvailableLocalAIProvider implements AIProvider {
  readonly id = 'local';
  readonly name = 'Active On-Device Model';
  readonly type = 'local_model' as const;

  async isAvailable(): Promise<boolean> {
    return true;
  }
  async generate(_req: AIRequest): Promise<AIResponse> {
    return { content: 'local result', providerId: this.id };
  }
  getCapabilities(): IntelligenceCapability[] {
    return [{ id: 'chat', category: 'conversation' }];
  }
}

describe('AI Router & Task Understanding', () => {
  let registry: AIProviderRegistry;
  let router: AIRouter;
  let taskClassifier: TaskUnderstandingService;

  beforeEach(() => {
    registry = new AIProviderRegistry();
    router = new AIRouter(registry);
    taskClassifier = new TaskUnderstandingService();
  });

  describe('AIRouter', () => {
    test('prefers local provider when available', async () => {
      registry.register(new AvailableLocalAIProvider());
      registry.register(new MockAIProvider(true));

      const decision = await router.route();
      expect(decision.providerId).toBe('local');
      expect(decision.confidence).toBe(1.0);
    });

    test('falls back to other available provider when local is unavailable', async () => {
      registry.register(new LocalAIProvider()); // isAvailable: false
      registry.register(new MockAIProvider(true)); // isAvailable: true

      const decision = await router.route();
      expect(decision.providerId).toBe('mock');
      expect(decision.confidence).toBe(0.7);
    });

    test('throws RoutingError when no provider is available', async () => {
      registry.register(new LocalAIProvider()); // isAvailable: false

      await expect(router.route()).rejects.toThrow(RoutingError);
    });
  });

  describe('TaskUnderstandingService', () => {
    test('classifies search intents', () => {
      const result = taskClassifier.classify('Search for Italian restaurants nearby');
      expect(result.type).toBe('SEARCH');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test('classifies app actions', () => {
      const result = taskClassifier.classify('Open YouTube and play this song');
      expect(result.type).toBe('APP_ACTION');
    });

    test('classifies phone actions', () => {
      const result = taskClassifier.classify('Call Rahul on phone');
      expect(result.type).toBe('PHONE_ACTION');
    });

    test('classifies question intents', () => {
      const result = taskClassifier.classify('What is the distance to the moon?');
      expect(result.type).toBe('QUESTION');
    });

    test('classifies reasoning and planning', () => {
      const result = taskClassifier.classify('Plan my trip to Japan');
      expect(result.type).toBe('REASONING');
    });

    test('classifies API/email tasks', () => {
      const result = taskClassifier.classify('Send this email to team');
      expect(result.type).toBe('API_TASK');
    });

    test('classifies empty or unknown inputs', () => {
      const result = taskClassifier.classify('');
      expect(result.type).toBe('UNKNOWN');
    });
  });
});
