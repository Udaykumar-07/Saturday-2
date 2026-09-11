/**
 * Context types for Saturday.
 * Context provides situational awareness to AI requests.
 */

import { Memory } from './memory';

export interface AIContext {
  /** Relevant memories for the current request */
  memories?: Memory[];
  /** Current local time as ISO string */
  currentTime?: string;
  /** Currently active app (future use) */
  currentApp?: string;
  /** Device information */
  deviceInfo?: Record<string, unknown>;
  /** System prompt additions from personality */
  systemPrompt?: string;
}

/**
 * Interface for pluggable context providers.
 * Each provider contributes a slice of context.
 */
export interface ContextProvider {
  /** Unique provider identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Gather context from this provider */
  getContext(): Promise<Partial<AIContext>>;
}
