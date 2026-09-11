import { AIProviderRegistry } from '../src/core/ai/AIProviderRegistry';
import { LocalAIProvider } from '../src/core/ai/LocalAIProvider';
import { MockAIProvider } from '../src/core/ai/MockAIProvider';
import { FailingAIProvider } from '../src/core/ai/FailingAIProvider';
import { AIProviderUnavailableError, AIProviderError } from '../src/core/types/errors';

describe('AI Provider Layer & Registry', () => {
  let registry: AIProviderRegistry;

  beforeEach(() => {
    registry = new AIProviderRegistry();
  });

  test('registers and unregisters providers', () => {
    const mock = new MockAIProvider();
    registry.register(mock);

    expect(registry.count).toBe(1);
    expect(registry.getProvider('mock')).toBe(mock);

    registry.unregister('mock');
    expect(registry.count).toBe(0);
    expect(registry.getProvider('mock')).toBeUndefined();
  });

  test('LocalAIProvider reports unavailable in Phase 1 and throws explicit error on generate', async () => {
    const local = new LocalAIProvider();
    expect(await local.isAvailable()).toBe(false);
    expect(local.getCapabilities()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'chat' }),
        expect.objectContaining({ id: 'offline' }),
        expect.objectContaining({ id: 'privacy' }),
      ])
    );

    await expect(
      local.generate({
        messages: [{ id: '1', role: 'user', content: 'hello', timestamp: Date.now() }],
      })
    ).rejects.toThrow(AIProviderError);
  });

  test('MockAIProvider generates responses with metadata', async () => {
    const mock = new MockAIProvider(true);
    expect(await mock.isAvailable()).toBe(true);

    const response = await mock.generate({
      messages: [{ id: '1', role: 'user', content: 'What are you?', timestamp: Date.now() }],
    });

    expect(response.content).toBeDefined();
    expect(response.providerId).toBe('mock');
    expect(response.metadata?.isMock).toBe(true);
    expect(response.usage?.inputTokens).toBeGreaterThan(0);
  });

  test('FailingAIProvider throws expected AIProviderError', async () => {
    const failing = new FailingAIProvider('Custom failure reason');
    expect(await failing.isAvailable()).toBe(true);

    await expect(
      failing.generate({
        messages: [{ id: '1', role: 'user', content: 'Hi', timestamp: Date.now() }],
      })
    ).rejects.toThrow('Custom failure reason');
  });

  test('AIProviderRegistry returns available providers and throws when none available', async () => {
    // Initially empty
    await expect(registry.getFirstAvailable()).rejects.toThrow(AIProviderUnavailableError);

    // Add unavailable local provider
    registry.register(new LocalAIProvider());
    await expect(registry.getFirstAvailable()).rejects.toThrow(AIProviderUnavailableError);

    // Add available mock provider
    const mock = new MockAIProvider(true);
    registry.register(mock);

    const available = await registry.getFirstAvailable();
    expect(available.id).toBe('mock');

    // Disable mock provider
    mock.setEnabled(false);
    await expect(registry.getFirstAvailable()).rejects.toThrow(AIProviderUnavailableError);
  });
});
