/**
 * Conversation and message types for Saturday.
 * These types define the core data structures for all conversations.
 */

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  /** Unique message identifier */
  id: string;
  /** Role of the message sender */
  role: MessageRole;
  /** Text content of the message */
  content: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Optional metadata for future extensibility */
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  /** Unique conversation identifier */
  id: string;
  /** Title derived from first message or explicitly set */
  title?: string;
  /** Ordered list of messages */
  messages: Message[];
  /** Unix timestamp in milliseconds */
  createdAt: number;
  /** Unix timestamp in milliseconds */
  updatedAt: number;
}

export interface ConversationMetadata {
  /** Unique conversation identifier */
  id: string;
  /** Display title */
  title?: string;
  /** Number of messages */
  messageCount: number;
  /** Last message preview */
  lastMessagePreview?: string;
  /** Unix timestamp in milliseconds */
  createdAt: number;
  /** Unix timestamp in milliseconds */
  updatedAt: number;
}
