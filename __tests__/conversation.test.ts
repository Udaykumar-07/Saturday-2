import { ConversationRepository } from '../src/storage/ConversationRepository';
import { Conversation, Message } from '../src/core/types/conversation';
import { StorageAdapter } from '../src/storage/StorageAdapter';

// In-memory storage adapter for unit tests
class MemoryStorageAdapter implements StorageAdapter {
  private store: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getAllKeys(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.store.keys());
    return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
  }

  async multiGet(keys: string[]): Promise<Record<string, string | null>> {
    const res: Record<string, string | null> = {};
    for (const key of keys) {
      res[key] = this.store.get(key) ?? null;
    }
    return res;
  }

  async multiSet(entries: Array<[string, string]>): Promise<void> {
    for (const [k, v] of entries) {
      this.store.set(k, v);
    }
  }

  async clear(prefix?: string): Promise<void> {
    if (prefix) {
      for (const key of this.store.keys()) {
        if (key.startsWith(prefix)) {
          this.store.delete(key);
        }
      }
    } else {
      this.store.clear();
    }
  }
}

describe('Conversation Persistence & Repository', () => {
  let storage: MemoryStorageAdapter;
  let repo: ConversationRepository;

  beforeEach(() => {
    storage = new MemoryStorageAdapter();
    repo = new ConversationRepository(storage);
  });

  test('saves and loads a conversation', async () => {
    const conversation: Conversation = {
      id: 'conv_1',
      title: 'First Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await repo.save(conversation);
    const loaded = await repo.load('conv_1');

    expect(loaded).toBeDefined();
    expect(loaded?.id).toBe('conv_1');
    expect(loaded?.title).toBe('First Chat');
    expect(loaded?.messages).toHaveLength(0);
  });

  test('appends messages and updates timestamps', async () => {
    const conversation: Conversation = {
      id: 'conv_2',
      title: 'Chat with messages',
      messages: [],
      createdAt: 1000,
      updatedAt: 1000,
    };

    await repo.save(conversation);

    const userMsg: Message = {
      id: 'msg_1',
      role: 'user',
      content: 'Hello Saturday',
      timestamp: 2000,
    };

    const updated = await repo.appendMessage('conv_2', userMsg);
    expect(updated.messages).toHaveLength(1);
    expect(updated.messages[0].content).toBe('Hello Saturday');
    expect(updated.updatedAt).toBeGreaterThan(1000);

    const reloaded = await repo.load('conv_2');
    expect(reloaded?.messages).toHaveLength(1);
  });

  test('lists all conversations in descending order of updatedAt', async () => {
    const conv1: Conversation = {
      id: 'c1',
      title: 'Old chat',
      messages: [{ id: 'm1', role: 'user', content: 'Old message', timestamp: 1000 }],
      createdAt: 1000,
      updatedAt: 1000,
    };
    const conv2: Conversation = {
      id: 'c2',
      title: 'New chat',
      messages: [{ id: 'm2', role: 'user', content: 'New message', timestamp: 2000 }],
      createdAt: 2000,
      updatedAt: 2000,
    };

    await repo.save(conv1);
    await repo.save(conv2);

    const list = await repo.listAll();
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('c2'); // Most recent first
    expect(list[1].id).toBe('c1');
    expect(list[0].lastMessagePreview).toBe('New message');
  });

  test('deletes a conversation', async () => {
    const conv: Conversation = {
      id: 'to_delete',
      title: 'Delete me',
      messages: [],
      createdAt: 1000,
      updatedAt: 1000,
    };

    await repo.save(conv);
    expect(await repo.load('to_delete')).not.toBeNull();

    await repo.delete('to_delete');
    expect(await repo.load('to_delete')).toBeNull();

    const list = await repo.listAll();
    expect(list.find((c) => c.id === 'to_delete')).toBeUndefined();
  });
});
