/**
 * Laya-powered on-device intent classifier for Saturday.
 *
 * Uses the Laya ONNX model running locally to classify user messages
 * into Saturday's TaskType system with ML-calibrated confidence scores.
 *
 * Architecture:
 *   USER MESSAGE
 *        |
 *   [Laya ONNX on-device]
 *        |
 *   Structured Decision (choice + noul + score)
 *        |
 *   Map to TaskIntent { type, confidence, entities }
 *
 * When Laya is not yet loaded (first launch before download),
 * returns null so the caller falls back to keyword classification.
 */

import { TaskIntent, TaskType } from '../../types/task';
import { LayaRuntime } from './LayaRuntime';
import type { ChoiceAnswer, NoulAnswer, Question, ScoreAnswer } from './LayaTypes';

/**
 * Saturday-specific Laya decision questions.
 * These define the structured classification schema.
 */
const SATURDAY_QUESTIONS: Record<string, Question> = {
  task_type: {
    type: 'choice',
    instructions:
      'Classify the primary intent of this user message to a personal AI assistant on their phone.',
    criteria: {
      CHAT: 'Casual conversation, greetings (hi, hello, hey), small talk, thanks, or general chat with no specific request',
      QUESTION:
        'Asking a factual question, seeking information, or requesting an explanation about a general topic',
      MEMORY_STORE:
        'User is sharing a personal fact they want remembered: their name, preferences, habits, or personal details',
      MEMORY_QUERY:
        'User is asking the assistant to recall something previously shared: what is my name, what do I like, do you remember',
      MEMORY_DELETE:
        'User wants the assistant to forget or delete stored personal information: forget my name, delete that',
      MEMORY_LIST:
        'User wants to see everything the assistant remembers about them: what do you know about me, list memories',
      SEARCH: 'User wants to search the web, Google something, find information online, or browse',
      APP_ACTION: 'User wants to open, launch, start, or interact with a specific app on their phone',
      PHONE_ACTION: 'User wants to make a phone call, send an SMS/text message, or dial a number',
      API_TASK: 'User wants to check email, weather, calendar, schedule, or other API-connected service',
      REASONING:
        'User wants analysis, comparison, evaluation, problem-solving, or complex reasoning',
      AGENT_TASK:
        'User wants a complex research or multi-provider task like travel planning, price comparison, or shopping',
      MULTI_STEP_TASK:
        'User request involves multiple sequential steps: first do X, then Y, after that Z',
    },
  },
  is_personal_fact: {
    type: 'noul',
    instructions:
      'Is the user sharing a durable personal fact about themselves (e.g., name, age, preference, hobby, habit, location) that should be stored and remembered for future conversations?',
  },
  urgency: {
    type: 'score',
    instructions: 'Rate how urgently this request needs to be handled by the AI assistant.',
    criteria: [
      'Low: casual chat, no time pressure, general curiosity',
      'Medium: standard request, normal priority, the user expects a useful answer',
      'High: time-sensitive request, the user seems to need this soon',
      'Critical: emergency or immediate action needed, the user is urgent',
    ],
  },
};

/**
 * Extended TaskIntent with Laya-specific metadata.
 */
export interface LayaClassificationResult extends TaskIntent {
  /** Classification source: 'laya' or 'keyword_fallback' */
  classifiedBy: 'laya' | 'keyword_fallback';
  /** Urgency score from Laya (0-3 scale, fractional) */
  urgencyScore?: number;
  /** Whether Laya detected a personal fact being shared */
  isPersonalFact?: boolean;
  /** Full probability distribution over task types */
  distribution?: Record<string, number>;
  /** Laya inference latency in milliseconds */
  latencyMs?: number;
  /** Suggested external providers for this task */
  suggestedProviders: string[];
  /** Whether this task requires external capabilities */
  requiresExternalCapabilities: boolean;
  /** Reasoning complexity level */
  reasoningComplexity: 'basic' | 'moderate' | 'deep';
  /** Estimated token count for this task */
  estimatedTokens: number;
}

export class LayaIntentClassifier {
  constructor(private runtime: LayaRuntime) {}

  /**
   * Classify a user message using the on-device Laya model.
   *
   * Returns a TaskIntent with ML-calibrated confidence scores.
   * If Laya is not ready (not downloaded/loaded), returns null
   * so the caller can fall back to keyword classification.
   */
  async classify(input: string): Promise<LayaClassificationResult | null> {
    if (!this.runtime.isReady) {
      return null;
    }

    const startTime = Date.now();

    try {
      const response = await this.runtime.systemOne(input, SATURDAY_QUESTIONS);
      const latencyMs = Date.now() - startTime;

      // Extract answers
      const taskTypeAnswer = response.answers.task_type as ChoiceAnswer;
      const personalFactAnswer = response.answers.is_personal_fact as NoulAnswer;
      const urgencyAnswer = response.answers.urgency as ScoreAnswer;

      if (!taskTypeAnswer || !taskTypeAnswer.choice) {
        console.warn('[Laya] Invalid response: missing task_type answer');
        return null;
      }

      // Validate and map task type
      let finalType = this.mapToTaskType(taskTypeAnswer.choice);

      // If Laya says CHAT but also detects a personal fact with high probability,
      // upgrade to MEMORY_STORE
      if (
        personalFactAnswer &&
        personalFactAnswer.noul > 0.7 &&
        finalType !== 'MEMORY_QUERY' &&
        finalType !== 'MEMORY_DELETE' &&
        finalType !== 'MEMORY_LIST'
      ) {
        finalType = 'MEMORY_STORE';
      }

      // Determine if external capabilities are required
      const requiresExternalCapabilities = 
        finalType === 'REASONING' ||
        finalType === 'AGENT_TASK' ||
        finalType === 'MULTI_STEP_TASK';

      // Suggest external providers if external capabilities are needed
      const suggestedProviders = requiresExternalCapabilities
        ? ['openai_provider', 'anthropic_provider', 'google_gemini_provider']
        : [];

      // Derive reasoning complexity
      let reasoningComplexity: 'basic' | 'moderate' | 'deep';
      if (finalType === 'REASONING') {
        reasoningComplexity = 'moderate';
      } else if (finalType === 'AGENT_TASK' || finalType === 'MULTI_STEP_TASK') {
        reasoningComplexity = 'deep';
      } else {
        reasoningComplexity = 'basic';
      }

      // Estimate token count (rough heuristic: 1 token ≈ 4 chars, multiply by 2 for input+output)
      const estimatedTokens = Math.ceil(input.length / 4) * 2;

      const result: LayaClassificationResult = {
        type: finalType,
        confidence: taskTypeAnswer.confidence,
        originalInput: input,
        classifiedBy: 'laya',
        isPersonalFact: personalFactAnswer ? personalFactAnswer.noul > 0.5 : false,
        urgencyScore: urgencyAnswer?.score,
        distribution: taskTypeAnswer.probabilities,
        latencyMs,
        suggestedProviders,
        requiresExternalCapabilities,
        reasoningComplexity,
        estimatedTokens,
      };

      console.log(
        `[Laya] Classified "${input.substring(0, 50)}" -> ${result.type} ` +
          `(confidence: ${(result.confidence * 100).toFixed(1)}%, ` +
          `personal_fact: ${result.isPersonalFact}, ` +
          `urgency: ${result.urgencyScore?.toFixed(1)}, ` +
          `external: ${result.requiresExternalCapabilities}, ` +
          `complexity: ${result.reasoningComplexity}, ` +
          `${latencyMs}ms)`,
      );

      return result;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      console.warn(
        `[Laya] Classification failed (${latencyMs}ms): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  /**
   * Map Laya's choice value to a valid Saturday TaskType.
   */
  private mapToTaskType(value: string): TaskType {
    const VALID_TYPES: TaskType[] = [
      'CHAT',
      'QUESTION',
      'KNOWLEDGE_QUERY',
      'MEMORY_STORE',
      'MEMORY_QUERY',
      'MEMORY_UPDATE',
      'MEMORY_DELETE',
      'MEMORY_LIST',
      'REASONING',
      'SEARCH',
      'PHONE_ACTION',
      'APP_ACTION',
      'API_TASK',
      'EXTERNAL_API',
      'AGENT_TASK',
      'EXTERNAL_AI',
      'MULTI_STEP_TASK',
      'UNKNOWN',
    ];

    const upper = value.toUpperCase();
    if (VALID_TYPES.includes(upper as TaskType)) {
      return upper as TaskType;
    }

    console.warn(`[Laya] Unknown task type: "${value}", defaulting to CHAT`);
    return 'CHAT';
  }
}
