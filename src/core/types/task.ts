/**
 * Task understanding types for Saturday.
 * These types define how Saturday classifies user intent.
 */

export type TaskType =
  | 'CHAT'
  | 'QUESTION'
  | 'KNOWLEDGE_QUERY'
  | 'MEMORY_STORE'
  | 'MEMORY_QUERY'
  | 'MEMORY_UPDATE'
  | 'MEMORY_DELETE'
  | 'MEMORY_LIST'
  | 'REASONING'
  | 'SEARCH'
  | 'PHONE_ACTION'
  | 'APP_ACTION'
  | 'API_TASK'
  | 'EXTERNAL_API'
  | 'AGENT_TASK'
  | 'EXTERNAL_AI'
  | 'MULTI_STEP_TASK'
  | 'UNKNOWN';

export interface TaskIntent {
  /** Classified task type */
  type: TaskType;
  /** Confidence in the classification (0-1) */
  confidence: number;
  /** Extracted entities from the request */
  entities?: Record<string, unknown>;
  /** Original user input that was classified */
  originalInput: string;
}
