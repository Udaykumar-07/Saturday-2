/**
 * Lightweight task classification service.
 * Phase 1: keyword-based heuristic classification.
 * Future: AI-powered intent classification.
 */

import { TaskIntent, TaskType } from '../types/task';

interface TaskPattern {
  type: TaskType;
  keywords: string[];
  weight: number;
}

const TASK_PATTERNS: TaskPattern[] = [
  {
    type: 'SEARCH',
    keywords: ['search', 'find', 'look up', 'google', 'lookup', 'browse'],
    weight: 0.7,
  },
  {
    type: 'PHONE_ACTION',
    keywords: ['call', 'phone', 'dial', 'ring', 'text', 'sms'],
    weight: 0.6,
  },
  {
    type: 'APP_ACTION',
    keywords: ['open', 'launch', 'play', 'show', 'start', 'run'],
    weight: 0.5,
  },
  {
    type: 'QUESTION',
    keywords: ['what', 'who', 'when', 'where', 'why', 'how', 'explain', 'tell me'],
    weight: 0.6,
  },
  {
    type: 'REASONING',
    keywords: ['analyze', 'compare', 'evaluate', 'think', 'consider', 'reason', 'plan'],
    weight: 0.5,
  },
  {
    type: 'API_TASK',
    keywords: ['email', 'send', 'weather', 'calendar', 'schedule', 'reminder'],
    weight: 0.5,
  },
  {
    type: 'MULTI_STEP_TASK',
    keywords: ['and then', 'after that', 'first', 'step', 'plan my'],
    weight: 0.4,
  },
];

export class TaskUnderstandingService {
  /**
   * Classify a user input into a task intent.
   * Phase 1 uses keyword matching. Future versions will use
   * AI-powered classification.
   */
  classify(input: string): TaskIntent {
    const lower = input.toLowerCase().trim();

    if (!lower) {
      return {
        type: 'UNKNOWN',
        confidence: 0,
        originalInput: input,
      };
    }

    let bestMatch: { type: TaskType; confidence: number } = {
      type: 'CHAT',
      confidence: 0.3,
    };

    for (const pattern of TASK_PATTERNS) {
      const matchCount = pattern.keywords.filter((kw) =>
        lower.includes(kw)
      ).length;

      if (matchCount > 0) {
        const confidence = Math.min(
          pattern.weight + matchCount * 0.1,
          0.9
        );

        if (confidence > bestMatch.confidence) {
          bestMatch = { type: pattern.type, confidence };
        }
      }
    }

    return {
      type: bestMatch.type,
      confidence: bestMatch.confidence,
      originalInput: input,
    };
  }
}
