/**
 * Task classification service with hybrid Laya AI + keyword fallback.
 *
 * Classification priority:
 *   1. High-confidence regex patterns (memory ops, app actions) — always first
 *   2. Laya on-device ONNX model — ML-powered structured decisions (when loaded)
 *   3. Keyword-based heuristic fallback — always available, offline
 *
 * This ensures fast, reliable classification for common intents
 * while using real ML for ambiguous or novel inputs.
 */

import { TaskIntent, TaskType } from '../types/task';
import { LayaIntentClassifier, type LayaClassificationResult } from '../ai/laya';

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
    keywords: ['analyze', 'compare', 'evaluate', 'think', 'consider', 'reason', 'plan', 'complex paper', 'difficult document'],
    weight: 0.5,
  },
  {
    type: 'API_TASK',
    keywords: ['email', 'emails', 'gmail', 'inbox', 'latest emails', 'send', 'weather', 'calendar', 'schedule', 'reminder'],
    weight: 0.6,
  },
  {
    type: 'AGENT_TASK',
    keywords: ['ask the', 'research', 'travel agent', 'flight', 'hotel', 'compare 20', 'compare 30', 'best option for this'],
    weight: 0.6,
  },
  {
    type: 'MULTI_STEP_TASK',
    keywords: ['and then', 'after that', 'first', 'step', 'plan my', 'and open the location'],
    weight: 0.4,
  },
];

export class TaskUnderstandingService {
  private layaClassifier: LayaIntentClassifier | null = null;

  /**
   * Set the Laya AI classifier for ML-powered intent classification.
   * Called by container.ts after the Laya runtime is initialized.
   */
  setLayaClassifier(classifier: LayaIntentClassifier): void {
    this.layaClassifier = classifier;
    console.log('[TaskUnderstanding] Laya classifier attached');
  }

  /**
   * Get the Laya classifier status.
   */
  get hasLayaClassifier(): boolean {
    return this.layaClassifier !== null;
  }

  /**
   * Async classification: tries Laya first, falls back to keyword matching.
   *
   * Priority:
   *   1. High-confidence regex patterns (memory ops, app actions)
   *   2. Laya on-device ML model
   *   3. Keyword-based heuristic fallback
   */
  async classifyAsync(input: string): Promise<TaskIntent> {
    const lower = input.toLowerCase().trim();

    if (!lower) {
      return { type: 'UNKNOWN', confidence: 0, originalInput: input };
    }

    // Step 1: Check high-confidence regex patterns first (fast + deterministic)
    const regexResult = this.classifyByRegex(lower, input);
    if (regexResult) {
      return regexResult;
    }

    // Step 2: Try Laya on-device ML classification
    if (this.layaClassifier) {
      const layaResult = await this.layaClassifier.classify(input);
      if (layaResult) {
        return layaResult;
      }
      // Laya returned null (not ready or error) — fall through to keywords
    }

    // Step 3: Keyword-based fallback (always available)
    return this.classifyByKeywords(lower, input);
  }

  /**
   * Synchronous classification (keyword-based only).
   * Used as immediate fallback when async is not possible.
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

    // Use regex first, then keywords
    const regexResult = this.classifyByRegex(lower, input);
    if (regexResult) return regexResult;

    return this.classifyByKeywords(lower, input);
  }

  // ── Private: Regex-based classification (high-confidence deterministic) ──

  private classifyByRegex(lower: string, input: string): TaskIntent | null {
    // Direct app actions: "search <query> on <app>", "play <song> on <app>", "open/launch <app>"
    if (
      /^(?:search|play)\s+.+?\s+on\s+[a-z0-9_.-]+/i.test(lower) ||
      /^(?:open|launch)\s+[a-z0-9_.-]+/i.test(lower)
    ) {
      return {
        type: 'APP_ACTION',
        confidence: 0.85,
        originalInput: input,
      };
    }

    // Memory Delete: "forget my name", "delete my name", "forget me", "clear my name"
    if (/^(?:please\s+)?(?:forget|delete|clear|remove)\s+(?:my\s+name|me|that\s+my\s+name)[\.!\?]*$/i.test(lower)) {
      return {
        type: 'MEMORY_DELETE',
        confidence: 0.95,
        entities: { target: 'user.name' },
        originalInput: input,
      };
    }

    // Memory Query: "what is my name?", "what's my name?", "who am i?", etc.
    if (
      !lower.startsWith('search') &&
      /^(?:what(?:'s|\s+is)\s+my\s+name|who\s+am\s+i|what\s+should\s+you\s+call\s+me|what\s+do\s+you\s+call\s+me|do\s+you\s+(?:remember|know)\s+my\s+name|tell\s+me\s+my\s+name)[\?!\.]*$/i.test(lower)
    ) {
      return {
        type: 'MEMORY_QUERY',
        confidence: 0.95,
        entities: { target: 'user.name' },
        originalInput: input,
      };
    }

    // Memory List: "what do you remember about me?", "list my memories"
    if (
      /^(?:what\s+do\s+you\s+(?:remember|know)(?:\s+about\s+me)?|what\s+memories\s+do\s+you\s+have|list\s+my\s+memories|show\s+memories)[\?!\.]*$/i.test(lower)
    ) {
      return {
        type: 'MEMORY_LIST',
        confidence: 0.9,
        originalInput: input,
      };
    }

    // Memory Update: "call me Kumar instead", "change my name to Kumar"
    if (
      /(?:call\s+me|my\s+name\s+is)\s+([a-zA-Z0-9_\-\s]+?)\s+instead/i.test(lower) ||
      /(?:update|change)\s+my\s+name\s+to\s+([a-zA-Z0-9_\-\s]+)/i.test(lower)
    ) {
      return {
        type: 'MEMORY_UPDATE',
        confidence: 0.95,
        entities: { target: 'user.name' },
        originalInput: input,
      };
    }

    // Memory Store: "hey my name is uk", "my name is Uday", "call me Uday"
    if (
      /(?:my\s+name(?:'s|\s+is)\s+[a-zA-Z0-9_\-]+|call\s+me\s+[a-zA-Z0-9_\-]+|you\s+can\s+call\s+me\s+[a-zA-Z0-9_\-]+|remember\s+(?:that\s+)?my\s+name\s+is)/i.test(lower) &&
      !lower.startsWith('what') && !lower.startsWith('do you') && !lower.startsWith('who')
    ) {
      return {
        type: 'MEMORY_STORE',
        confidence: 0.95,
        entities: { target: 'user.name' },
        originalInput: input,
      };
    }

    // Knowledge Query for specific science terms
    if (
      /^(?:what\s+(?:is|are)\s+|explain\s+|tell\s+me\s+about\s+|define\s+)(?:a\s+|an\s+|the\s+)?(mitochondria|photosynthesis|dna|rna|ribosome|gravity)[\?!\.]*$/i.test(lower)
    ) {
      const match = lower.match(/(?:mitochondria|photosynthesis|dna|rna|ribosome|gravity)/i);
      return {
        type: 'KNOWLEDGE_QUERY',
        confidence: 0.9,
        entities: { subject: match ? match[0] : '' },
        originalInput: input,
      };
    }

    return null; // No high-confidence regex match
  }

  // ── Private: Keyword-based classification (always-available fallback) ──

  private classifyByKeywords(lower: string, input: string): TaskIntent {
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

