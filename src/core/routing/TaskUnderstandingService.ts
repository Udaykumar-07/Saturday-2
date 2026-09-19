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

    // ── Memory Operations (Priority over general questions) ──

    // Memory Delete: "forget my name", "delete my name", "forget me", "clear my name"
    if (/^(?:please\s+)?(?:forget|delete|clear|remove)\s+(?:my\s+name|me|that\s+my\s+name)[\.!\?]*$/i.test(lower)) {
      return {
        type: 'MEMORY_DELETE',
        confidence: 0.95,
        entities: { target: 'user.name' },
        originalInput: input,
      };
    }

    // Memory Query: "what is my name?", "what's my name?", "who am i?", "what should you call me?", "do you remember my name?"
    // (Excludes explicit web searches like "search my name on Google")
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

    // Memory List: "what do you remember about me?", "what do you know about me?", "list my memories"
    if (
      /^(?:what\s+do\s+you\s+(?:remember|know)(?:\s+about\s+me)?|what\s+memories\s+do\s+you\s+have|list\s+my\s+memories|show\s+memories)[\?!\.]*$/i.test(lower)
    ) {
      return {
        type: 'MEMORY_LIST',
        confidence: 0.9,
        originalInput: input,
      };
    }

    // Memory Update: "call me Kumar instead", "my name is Kumar instead", "change my name to Kumar"
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

    // Memory Store: "hey my name is uk", "my name is Uday", "call me Uday", "remember that my name is..."
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

    // Knowledge Query specifically for biology/science definition queries (e.g. "What are mitochondria?")
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
