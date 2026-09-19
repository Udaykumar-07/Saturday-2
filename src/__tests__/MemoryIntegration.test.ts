/**
 * End-to-End Acceptance Tests for Memory + Task Routing.
 *
 * Verifies exact flow requested in Section 28:
 * 1. "My name is Uday." -> stores name
 * 2. "What is my name?" -> "Your name is Uday."
 * 3. App Restart -> memories persist
 * 4. "What is my name?" -> "Your name is Uday."
 * 5. "Forget my name." -> clears name
 * 6. "What is my name?" -> "I don't have your name saved yet. What should I call you?"
 * 7. "My name is Kumar." -> updates name
 * 8. "What should you call me?" -> "Your name is Kumar."
 * 9. "What are mitochondria?" -> Knowledge query, answered without "Search What mitochondria on Chrome".
 * 10. "Search my name on Google" -> Handled as web search/action, not memory.
 */

import { ConversationService } from '../services/ConversationService';
import { ConversationRepository } from '../storage/ConversationRepository';
import { PersonalityRepository } from '../storage/PersonalityRepository';
import { PersonalityService } from '../services/PersonalityService';
import { AIProviderRegistry } from '../core/ai/AIProviderRegistry';
import { AIRouter } from '../core/routing/AIRouter';
import { ContextService } from '../core/context/ContextService';
import { TaskUnderstandingService } from '../core/routing/TaskUnderstandingService';
import { MemoryRepository } from '../storage/MemoryRepository';
import { MemoryService } from '../services/MemoryService';
import { StorageAdapter } from '../storage/StorageAdapter';
import { LocalAIProvider } from '../core/ai/LocalAIProvider';

class PersistentTestStorage implements StorageAdapter {
  private store = new Map<string, string>();

  async get(key: string) { return this.store.get(key) ?? null; }
  async set(key: string, value: string) { this.store.set(key, value); }
  async remove(key: string) { this.store.delete(key); }
  async getAllKeys() { return Array.from(this.store.keys()); }
  async multiGet(keys: string[]) {
    const res: Record<string, string | null> = {};
    for (const k of keys) res[k] = this.store.get(k) ?? null;
    return res;
  }
  async multiSet(entries: Array<[string, string]>) {
    for (const [k, v] of entries) this.store.set(k, v);
  }
  async clear(prefix?: string) {
    if (!prefix) {
      this.store.clear();
      return;
    }
    for (const k of Array.from(this.store.keys())) {
      if (k.startsWith(prefix)) this.store.delete(k);
    }
  }
}

describe('Memory + Task Routing Integration (Section 28)', () => {
  let storage: PersistentTestStorage;

  function buildServiceContainer(sharedStorage: PersistentTestStorage) {
    const convRepo = new ConversationRepository(sharedStorage);
    const persRepo = new PersonalityRepository(sharedStorage);
    const persService = new PersonalityService(persRepo);
    const memoryRepo = new MemoryRepository(sharedStorage);
    const memoryService = new MemoryService(memoryRepo);
    const taskUnderstanding = new TaskUnderstandingService();

    const registry = new AIProviderRegistry();
    const localAI = new LocalAIProvider({
      enabled: true,
      mode: 'embedded',
      modelId: 'qwen2.5-0.5b',
    });
    registry.register(localAI);
    const router = new AIRouter(registry);
    const contextService = new ContextService();

    const convService = new ConversationService(
      convRepo,
      registry,
      router,
      contextService,
      persService,
      taskUnderstanding,
      undefined, // actionService
      undefined, // externalService
      memoryService
    );

    return { convService, memoryService, persService };
  }

  beforeEach(() => {
    storage = new PersistentTestStorage();
  });

  test('executes complete memory lifecycle across app restart', async () => {
    let { convService } = buildServiceContainer(storage);
    const conv = await convService.create();

    // ── Step 1: "My name is Uday." ──
    const step1 = await convService.sendMessage(conv.id, 'My name is Uday.');
    expect(step1.assistantMessage.content).toContain('Uday');
    expect(step1.assistantMessage.content).not.toContain('Chrome');

    // ── Step 2: "What is my name?" ──
    const step2 = await convService.sendMessage(conv.id, 'What is my name?');
    expect(step2.assistantMessage.content).toBe('Your name is Uday.');

    // ── Step 3: Simulate App / Process Restart ──
    // Re-create services from the same underlying persistent storage
    const restarted = buildServiceContainer(storage);
    convService = restarted.convService;

    // ── Step 4: "What is my name?" after restart ──
    const step4 = await convService.sendMessage(conv.id, 'What is my name?');
    expect(step4.assistantMessage.content).toBe('Your name is Uday.');

    // ── Step 5: "Forget my name." ──
    const step5 = await convService.sendMessage(conv.id, 'Forget my name.');
    expect(step5.assistantMessage.content).toBe("I've forgotten your name.");

    // ── Step 6: "What is my name?" after deletion ──
    const step6 = await convService.sendMessage(conv.id, 'What is my name?');
    expect(step6.assistantMessage.content).toBe("I don't have your name saved yet. What should I call you?");
    expect(step6.assistantMessage.content).not.toContain('Uday');
    expect(step6.assistantMessage.content).not.toContain('Chrome');

    // ── Step 7: "My name is Kumar." ──
    const step7 = await convService.sendMessage(conv.id, 'My name is Kumar.');
    expect(step7.assistantMessage.content).toContain('Kumar');

    // ── Step 8: "What should you call me?" ──
    const step8 = await convService.sendMessage(conv.id, 'What should you call me?');
    expect(step8.assistantMessage.content).toBe('Your name is Kumar.');
  });

  test('answers "What are mitochondria?" cleanly without malformed search suggestions', async () => {
    const { convService } = buildServiceContainer(storage);
    const conv = await convService.create();

    const res = await convService.sendMessage(conv.id, 'What are mitochondria?');
    expect(res.assistantMessage.content).toContain('powerhouse of the cell');
    expect(res.assistantMessage.content).not.toContain('Search What mitochondria on Chrome');
  });

  test('treats "Search my name on Google" as search rather than memory query', () => {
    const taskUnderstanding = new TaskUnderstandingService();
    const intent = taskUnderstanding.classify('Search my name on Google');

    expect(intent.type).toBe('APP_ACTION');
    expect(intent.type).not.toBe('MEMORY_QUERY');
  });
});
