/**
 * Repository for conversation persistence.
 * The UI never directly manipulates raw storage.
 */

import { Conversation, ConversationMetadata, Message } from '../core/types/conversation';
import { StorageAdapter } from './StorageAdapter';
import { StorageError } from '../core/types/errors';

const CONVERSATION_PREFIX = '@saturday/conversations/';
const CONVERSATION_LIST_KEY = '@saturday/conversation-list';

export class ConversationRepository {
  constructor(private storage: StorageAdapter) {}

  /** Save a conversation. */
  async save(conversation: Conversation): Promise<void> {
    const key = `${CONVERSATION_PREFIX}${conversation.id}`;
    await this.storage.set(key, JSON.stringify(conversation));
    await this.updateIndex(conversation.id, 'add');
  }

  /** Load a conversation by ID. Returns null if not found. */
  async load(id: string): Promise<Conversation | null> {
    const key = `${CONVERSATION_PREFIX}${id}`;
    const raw = await this.storage.get(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as Conversation;
    } catch {
      throw new StorageError(`Failed to parse conversation "${id}"`);
    }
  }

  /** Delete a conversation by ID. */
  async delete(id: string): Promise<void> {
    const key = `${CONVERSATION_PREFIX}${id}`;
    await this.storage.remove(key);
    await this.updateIndex(id, 'remove');
  }

  /** List all conversation metadata, sorted by most recent. */
  async listAll(): Promise<ConversationMetadata[]> {
    const ids = await this.getIndex();
    const keys = ids.map((id) => `${CONVERSATION_PREFIX}${id}`);

    if (keys.length === 0) return [];

    const values = await this.storage.multiGet(keys);
    const conversations: ConversationMetadata[] = [];

    for (const key of keys) {
      const raw = values[key];
      if (!raw) continue;

      try {
        const conv = JSON.parse(raw) as Conversation;
        const lastMessage = conv.messages[conv.messages.length - 1];
        conversations.push({
          id: conv.id,
          title: conv.title,
          messageCount: conv.messages.length,
          lastMessagePreview: lastMessage?.content.substring(0, 100),
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        });
      } catch {
        // Skip malformed conversations
      }
    }

    return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /** Append a message to a conversation. */
  async appendMessage(conversationId: string, message: Message): Promise<Conversation> {
    const conversation = await this.load(conversationId);
    if (!conversation) {
      throw new StorageError(`Conversation "${conversationId}" not found`);
    }

    conversation.messages.push(message);
    conversation.updatedAt = Date.now();
    await this.save(conversation);
    return conversation;
  }

  /** Clear all conversations. */
  async clearAll(): Promise<void> {
    await this.storage.clear(CONVERSATION_PREFIX);
    await this.storage.remove(CONVERSATION_LIST_KEY);
  }

  private async getIndex(): Promise<string[]> {
    const raw = await this.storage.get(CONVERSATION_LIST_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }

  private async updateIndex(id: string, action: 'add' | 'remove'): Promise<void> {
    const ids = await this.getIndex();
    if (action === 'add') {
      if (!ids.includes(id)) {
        ids.push(id);
      }
    } else {
      const idx = ids.indexOf(id);
      if (idx >= 0) ids.splice(idx, 1);
    }
    await this.storage.set(CONVERSATION_LIST_KEY, JSON.stringify(ids));
  }
}
