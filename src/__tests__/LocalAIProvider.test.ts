/**
 * Tests for LocalAIProvider and LocalInferenceEngine.
 */

import { LocalAIProvider } from '../core/ai/LocalAIProvider';
import { DEFAULT_LOCAL_MODEL_ID } from '../core/ai/LocalAIModelRegistry';
import { AIProviderError } from '../core/types/errors';

describe('LocalAIProvider', () => {
  test('reports unavailable by default when no config provided', async () => {
    const provider = new LocalAIProvider();
    expect(await provider.isAvailable()).toBe(false);
    expect(provider.getActiveModel().id).toBe(DEFAULT_LOCAL_MODEL_ID);

    await expect(
      provider.generate({
        messages: [{ id: '1', role: 'user', content: 'hello', timestamp: Date.now() }],
      })
    ).rejects.toThrow(AIProviderError);
  });

  test('reports available when configured with enabled: true', async () => {
    const provider = new LocalAIProvider({ enabled: true });
    expect(await provider.isAvailable()).toBe(true);
  });

  test('generates response using embedded offline engine (Qwen 2.5 0.5B default)', async () => {
    const provider = new LocalAIProvider({ enabled: true, mode: 'embedded' });

    const response = await provider.generate({
      messages: [
        { id: '1', role: 'user', content: 'Who are you?', timestamp: Date.now() },
      ],
      context: {
        systemPrompt: 'You are Saturday.',
      },
    });

    expect(response.content).toBeDefined();
    expect(response.content).toContain('Saturday');
    expect(response.providerId).toBe('local');
    expect(response.metadata?.isLocal).toBe(true);
    expect(response.metadata?.mode).toBe('embedded');
    expect(response.usage?.inputTokens).toBeGreaterThan(0);
    expect(response.usage?.outputTokens).toBeGreaterThan(0);
  });

  test('answers capability questions detailing media playback and actions', async () => {
    const provider = new LocalAIProvider({ enabled: true, mode: 'embedded' });

    const response = await provider.generate({
      messages: [
        { id: '1', role: 'user', content: 'What can you do?', timestamp: Date.now() },
      ],
    });

    expect(response.content).toContain('Play media');
    expect(response.content).toContain('YouTube');
  });

  test('incorporates context memories into generated response', async () => {
    const provider = new LocalAIProvider({ enabled: true, mode: 'embedded' });

    const response = await provider.generate({
      messages: [
        { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
      ],
      context: {
        memories: [
          {
            id: 'm1',
            category: 'preferences',
            key: 'favorite band',
            value: 'Imagine Dragons',
            confidence: 1.0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      },
    });

    expect(response.content).toContain('Imagine Dragons');
  });

  test('switches active model and retrieves updated model info', () => {
    const provider = new LocalAIProvider({ enabled: true });

    expect(provider.getActiveModel().id).toBe('qwen2.5:0.5b');

    const switched = provider.setModel('smollm2:360m');
    expect(switched).toBe(true);
    expect(provider.getActiveModel().name).toBe('SmolLM2 360M Instruct');
    expect(provider.getActiveModel().parameters).toBe('360M');

    // Invalid model returns false
    expect(provider.setModel('non-existent-model')).toBe(false);
  });

  test('returns all curated local models', () => {
    const provider = new LocalAIProvider();
    const models = provider.getAllModels();

    expect(models.length).toBeGreaterThanOrEqual(3);
    expect(models.some((m) => m.id === 'qwen2.5:0.5b')).toBe(true);
    expect(models.some((m) => m.id === 'smollm2:360m')).toBe(true);
    expect(models.some((m) => m.id === 'llama3.2:1b')).toBe(true);
  });

  test('has expected intelligence capabilities', () => {
    const provider = new LocalAIProvider();
    const caps = provider.getCapabilities();

    expect(caps.some((c) => c.id === 'chat')).toBe(true);
    expect(caps.some((c) => c.id === 'offline')).toBe(true);
    expect(caps.some((c) => c.id === 'privacy')).toBe(true);
    expect(caps.some((c) => c.id === 'phone_actions')).toBe(true);
  });
});
