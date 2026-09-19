import { QwenProvider } from '../core/ai/qwen/QwenProvider';
import { QwenModelRuntime } from '../core/ai/qwen/QwenModelRuntime';
import { QwenTokenizer } from '../core/ai/qwen/QwenTokenizer';
import { QwenLogger } from '../core/ai/qwen/QwenLogger';
import { ProviderHealthTracker } from '../core/external/health/ProviderHealthTracker';

describe('Qwen On-Device Provider & Runtime', () => {
  let runtime: QwenModelRuntime;
  let provider: QwenProvider;
  let healthTracker: ProviderHealthTracker;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    runtime = new QwenModelRuntime();
    healthTracker = new ProviderHealthTracker();
    provider = new QwenProvider(runtime, healthTracker);
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('deterministic lifecycle: UNINITIALIZED -> READY', async () => {
    expect(provider.getStatus().state).toBe('UNINITIALIZED');
    expect(provider.getStatus().loaded).toBe(false);

    await provider.initialize();

    const status = provider.getStatus();
    expect(status.state).toBe('READY');
    expect(status.loaded).toBe(true);
    expect(status.modelId).toBe('qwen2.5:0.5b');
    expect(status.contextWindow).toBe(32768);
    expect(status.quantization).toBe('Q4_K_M');
    expect(status.ramUsageMB).toBeLessThanOrEqual(1024);
  });

  test('tokenizer encodes and decodes ChatML with special tokens', () => {
    const tokenizer = new QwenTokenizer();
    const chat = tokenizer.applyChatTemplate(
      [{ role: 'user', content: 'Say exactly: QWEN_TEST_OK' }],
      'You are Saturday.'
    );

    expect(chat).toContain('<|im_start|>system');
    expect(chat).toContain('<|im_end|>');
    expect(chat).toContain('<|im_start|>user');

    const tokenIds = tokenizer.encode(chat);
    expect(tokenIds.length).toBeGreaterThan(5);

    const decoded = tokenizer.decode(tokenIds, false);
    expect(decoded).toBe(chat);
  });

  test('SECTION 6 DIRECT TEST: Say exactly: QWEN_TEST_OK', async () => {
    await provider.initialize();

    const response = await provider.generate({
      messages: [
        {
          id: '1',
          role: 'user',
          content: 'Say exactly: QWEN_TEST_OK',
          timestamp: Date.now(),
        },
      ],
    });

    expect(response.content).toBe('QWEN_TEST_OK');
    expect(response.providerId).toBe('qwen-local');
    expect(response.modelId).toBe('qwen2.5:0.5b');
    expect(response.usage?.inputTokens).toBeGreaterThan(0);
    expect(response.usage?.outputTokens).toBeGreaterThan(0);
  });

  test('SECTION 7 DIRECT TEST: What is 2 + 2? -> 4', async () => {
    await provider.initialize();

    const response = await provider.generate({
      messages: [
        {
          id: '2',
          role: 'user',
          content: 'What is 2 + 2?',
          timestamp: Date.now(),
        },
      ],
    });

    expect(response.content.trim()).toBe('4');
  });

  test('generates structured developer logs for inference', async () => {
    await provider.initialize();
    consoleSpy.mockClear();

    await provider.generate({
      messages: [
        {
          id: '3',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        },
      ],
    });

    const logs = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(logs).toContain('QWEN_REQUEST');
    expect(logs).toContain('QWEN_INFERENCE_START');
    expect(logs).toContain('QWEN_INFERENCE_END');
    expect(logs).toContain('QWEN_RESPONSE');
  });

  test('tracks operational health via ProviderHealthTracker', async () => {
    await provider.initialize();

    await provider.generate({
      messages: [
        {
          id: '4',
          role: 'user',
          content: 'What are mitochondria?',
          timestamp: Date.now(),
        },
      ],
    });

    const health = healthTracker.getHealth('qwen-local');
    expect(health.available).toBe(true);
    expect(health.errorRate).toBe(0);
    expect(health.lastSuccess).toBeDefined();
  });

  test('fails gracefully when RAM limit is exceeded', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const lowMemoryRuntime = new QwenModelRuntime();

    await expect(lowMemoryRuntime.initialize(256)).rejects.toThrow(
      /MODEL_MEMORY_LIMIT/
    );

    const status = lowMemoryRuntime.getStatus();
    expect(status.state).toBe('FAILED');
    expect(status.lastError?.code).toBe('QWEN_INIT_FAILED');
    errorSpy.mockRestore();
  });
});
