/**
 * ReflectionGenerator - Creates verbal self-reflection from failed responses
 * Based on Reflexion paper: converts binary feedback → actionable text
 * 
 * OPTIMIZATION: Runs in background, doesn't block user responses
 */

import { EvaluationResult } from '../validation/ResponseEvaluator';

export interface Reflection {
  id: string;
  timestamp: number;
  userQuery: string;
  failedResponse: string;
  evaluation: EvaluationResult;
  verbalReflection: string;
  actionableHints: string[];
  queryPattern: string; // For similarity matching
}

export interface ReflectionContext {
  userInput: string;
  response: string;
  evaluation: EvaluationResult;
  attemptNumber: number;
}

export class ReflectionGenerator {
  /**
   * FAST: Generate reflection using rule-based patterns
   * Fallback to simple templates if LLM unavailable
   * 
   * Returns immediately with synchronous reflection
   */
  generateReflection(context: ReflectionContext): Reflection {
    const startTime = Date.now();

    // Rule-based reflection generation (no LLM needed!)
    const verbalReflection = this.buildReflectionFromRules(context);
    const actionableHints = this.extractActionableHints(context);
    const queryPattern = this.extractQueryPattern(context.userInput);

    const reflection: Reflection = {
      id: this.generateId(),
      timestamp: Date.now(),
      userQuery: context.userInput,
      failedResponse: context.response,
      evaluation: context.evaluation,
      verbalReflection,
      actionableHints,
      queryPattern,
    };

    const elapsed = Date.now() - startTime;
    console.log(`✅ Reflection generated in ${elapsed}ms`);

    return reflection;
  }

  /**
   * ULTRA FAST: Rule-based reflection (no LLM inference)
   * Converts failure reasons into actionable verbal feedback
   */
  private buildReflectionFromRules(context: ReflectionContext): string {
    const { evaluation, userInput, response } = context;
    
    if (evaluation.failureReasons.length === 0) {
      return 'Response passed all checks.';
    }

    // Pattern-based reflection templates
    const reflections: string[] = [];

    for (const reason of evaluation.failureReasons) {
      if (reason.includes('Repeated phrase')) {
        const match = reason.match(/"([^"]+)"/);
        const phrase = match ? match[1] : 'unknown';
        reflections.push(
          `Failed because: I repeated the phrase "${phrase}" too many times without adding new information. ` +
          `Next attempt: I should check my knowledge base first, and if information is unavailable, ` +
          `admit I don't know rather than repeating myself.`
        );
      }

      else if (reason.includes('too short')) {
        reflections.push(
          `Failed because: My response was too brief and didn't properly address the question. ` +
          `Next attempt: I should provide a complete answer with context and examples.`
        );
      }

      else if (reason.includes('hallucination pattern')) {
        reflections.push(
          `Failed because: I generated content that wasn't grounded in my knowledge base or user memories. ` +
          `Next attempt: I must verify facts against stored knowledge before responding, ` +
          `and clearly state "I don't have information about that" if the answer is unknown.`
        );
      }

      else if (reason.includes('not grounded in knowledge base')) {
        reflections.push(
          `Failed because: My answer included facts not present in my knowledge base. ` +
          `Next attempt: I should search my embedded knowledge first, check user memories second, ` +
          `and suggest using web search if information is unavailable locally.`
        );
      }

      else if (reason.includes('does not reference stored memories')) {
        reflections.push(
          `Failed because: The user asked about stored personal information, but I didn't use their memory data. ` +
          `Next attempt: I should retrieve relevant memories using the memory service before generating a response.`
        );
      }

      else {
        // Generic reflection
        reflections.push(
          `Failed because: ${reason}. ` +
          `Next attempt: I should validate my response more carefully before returning it.`
        );
      }
    }

    return reflections.join('\n\n');
  }

  /**
   * FAST: Extract actionable hints from failure
   * These are used to condition the next attempt
   */
  private extractActionableHints(context: ReflectionContext): string[] {
    const hints: string[] = [];
    const { evaluation, userInput } = context;

    for (const reason of evaluation.failureReasons) {
      if (reason.includes('Repeated phrase')) {
        hints.push('Avoid repeating the same phrases');
        hints.push('Check knowledge base before answering');
        hints.push('Admit lack of knowledge if uncertain');
      }

      else if (reason.includes('hallucination')) {
        hints.push('Verify facts against knowledge base');
        hints.push('Cite evidence sources');
        hints.push('Use memory retrieval for personal queries');
      }

      else if (reason.includes('not grounded')) {
        hints.push('Search embedded knowledge first');
        hints.push('Retrieve user memories for personal questions');
        hints.push('Suggest web search for unknown topics');
      }

      else if (reason.includes('too short')) {
        hints.push('Provide complete answers with context');
        hints.push('Include examples when helpful');
      }
    }

    // Deduplicate hints
    return Array.from(new Set(hints));
  }

  /**
   * INSTANT: Extract query pattern for similarity matching
   * Groups similar queries (e.g., "who is X" pattern)
   */
  private extractQueryPattern(userInput: string): string {
    const lower = userInput.toLowerCase().trim();

    // Math patterns
    if (/\d+\s*[\+\-\*\/x]\s*\d+/.test(lower)) {
      return 'math_expression';
    }

    // Memory patterns
    if (/what('?s| is) my/.test(lower)) {
      return 'memory_recall';
    }

    // Factual patterns
    if (/^(who is|who was|who are)/.test(lower)) {
      return 'who_is_query';
    }

    if (/^(what is|what are|what was)/.test(lower)) {
      return 'what_is_query';
    }

    if (/^(when did|when was|when is)/.test(lower)) {
      return 'when_query';
    }

    if (/^(where is|where are|where was)/.test(lower)) {
      return 'where_query';
    }

    // Time patterns
    if (/what time|current time|what('?s| is) the time/.test(lower)) {
      return 'time_query';
    }

    // Conversational
    if (/^(hi|hello|hey|good morning|good evening)/.test(lower)) {
      return 'greeting';
    }

    return 'general_query';
  }

  /**
   * INSTANT: Generate unique ID
   */
  private generateId(): string {
    return `refl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
