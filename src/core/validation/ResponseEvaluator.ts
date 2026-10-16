/**
 * ResponseEvaluator - Fast validation of LLM outputs
 * Detects hallucinations, repetition, and nonsense patterns
 * All checks run in parallel for maximum speed
 */

import { Memory } from '../types/memory';

export interface EvaluationResult {
  passed: boolean;
  score: number; // 0-1
  failureReasons: string[];
  confidence: number;
  fastPath?: boolean; // True if deterministic check was used
}

export interface EvaluationContext {
  memories: Memory[];
  knowledgeBase?: Map<string, string>; // Pre-indexed for fast lookup
  expectedType?: 'math' | 'factual' | 'conversational' | 'memory';
  userInput: string;
}

export class ResponseEvaluator {
  private repetitionThreshold = 3; // Max times a phrase can repeat
  private minResponseLength = 3;
  private maxResponseLength = 1000; // Increased from 500 to allow fuller responses

  /**
   * FAST evaluation - all checks run in parallel
   * Returns in <5ms for most queries
   */
  async evaluate(
    response: string,
    context: EvaluationContext
  ): Promise<EvaluationResult> {
    const startTime = Date.now();

    // Run all checks in parallel for speed
    const [
      repetitionCheck,
      nonsenseCheck,
      factualCheck,
      lengthCheck,
      evidenceCheck,
    ] = await Promise.all([
      this.checkRepetition(response),
      this.checkNonsensePatterns(response),
      this.checkFactualGrounding(response, context),
      this.checkLength(response),
      this.checkEvidenceGrounding(response, context),
    ]);

    const checks = [
      repetitionCheck,
      nonsenseCheck,
      factualCheck,
      lengthCheck,
      evidenceCheck,
    ];

    const result = this.aggregateChecks(checks);
    
    const elapsed = Date.now() - startTime;
    if (elapsed > 10) {
      console.warn(`⚠️ Slow evaluation: ${elapsed}ms`);
    }

    return result;
  }

  /**
   * SUPER FAST: Check for repetitive text patterns
   * Catches: "Elon Musk Elon Musk Elon Musk..."
   */
  private async checkRepetition(response: string): Promise<EvaluationResult> {
    const words = response.toLowerCase().split(/\s+/);
    const phrases: Map<string, number> = new Map();

    // Check 2-4 word phrases
    for (let len = 2; len <= 4; len++) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ');
        phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
      }
    }

    // Find max repetition count
    let maxRepetitions = 0;
    let repeatedPhrase = '';
    for (const [phrase, count] of phrases.entries()) {
      if (count > maxRepetitions && phrase.length > 5) {
        maxRepetitions = count;
        repeatedPhrase = phrase;
      }
    }

    const passed = maxRepetitions < this.repetitionThreshold;
    return {
      passed,
      score: passed ? 1.0 : 0.3,
      failureReasons: passed ? [] : [`Repeated phrase "${repeatedPhrase}" ${maxRepetitions} times`],
      confidence: 0.95,
      fastPath: true,
    };
  }

  /**
   * FAST: Detect nonsense patterns
   * Catches: Empty responses, single chars, gibberish
   */
  private async checkNonsensePatterns(response: string): Promise<EvaluationResult> {
    const trimmed = response.trim();
    const failureReasons: string[] = [];

    // Empty or too short
    if (trimmed.length < this.minResponseLength) {
      failureReasons.push('Response too short');
    }

    // Single character repeated
    if (/^(.)\1+$/.test(trimmed)) {
      failureReasons.push('Response is single repeated character');
    }

    // Only special characters
    if (/^[^a-zA-Z0-9]{3,}$/.test(trimmed)) {
      failureReasons.push('Response contains only special characters');
    }

    // Known hallucination patterns
    const hallucinationPatterns = [
      /is a character from anime/i,
      /is a fictional character/i,
      /I don't have access to real-time/i,
      /as an AI language model/i,
      /my knowledge cutoff/i,
    ];

    for (const pattern of hallucinationPatterns) {
      if (pattern.test(response)) {
        failureReasons.push('Contains known hallucination pattern');
        break;
      }
    }

    const passed = failureReasons.length === 0;
    return {
      passed,
      score: passed ? 1.0 : 0.2,
      failureReasons,
      confidence: 0.9,
      fastPath: true,
    };
  }

  /**
   * FAST: Check response length bounds
   */
  private async checkLength(response: string): Promise<EvaluationResult> {
    const length = response.trim().length;
    const passed = length >= this.minResponseLength && length <= this.maxResponseLength;

    return {
      passed,
      score: passed ? 1.0 : 0.5,
      failureReasons: passed ? [] : [`Response length ${length} out of bounds`],
      confidence: 1.0,
      fastPath: true,
    };
  }

  /**
   * MEDIUM SPEED: Check if response is grounded in evidence
   * Verifies facts against memory and knowledge base
   */
  private async checkFactualGrounding(
    response: string,
    context: EvaluationContext
  ): Promise<EvaluationResult> {
    // Skip for conversational responses
    if (context.expectedType === 'conversational') {
      return { passed: true, score: 1.0, failureReasons: [], confidence: 1.0, fastPath: true };
    }

    // Check memory grounding for memory queries
    if (context.expectedType === 'memory') {
      const memoryMentioned = context.memories.some(m =>
        response.toLowerCase().includes(m.value.toLowerCase())
      );

      if (!memoryMentioned && context.memories.length > 0) {
        return {
          passed: false,
          score: 0.4,
          failureReasons: ['Response does not reference stored memories'],
          confidence: 0.8,
        };
      }
    }

    // For factual queries, check knowledge base
    if (context.expectedType === 'factual' && context.knowledgeBase) {
      const lowerResponse = response.toLowerCase();
      let hasGrounding = false;

      for (const [key, value] of context.knowledgeBase) {
        if (lowerResponse.includes(key.toLowerCase()) || lowerResponse.includes(value.toLowerCase())) {
          hasGrounding = true;
          break;
        }
      }

      if (!hasGrounding) {
        return {
          passed: false,
          score: 0.5,
          failureReasons: ['Response not grounded in knowledge base'],
          confidence: 0.7,
        };
      }
    }

    return { passed: true, score: 1.0, failureReasons: [], confidence: 0.8 };
  }

  /**
   * FAST: Check if response cites evidence sources
   */
  private async checkEvidenceGrounding(
    response: string,
    context: EvaluationContext
  ): Promise<EvaluationResult> {
    // Only check for factual responses
    if (context.expectedType !== 'factual') {
      return { passed: true, score: 1.0, failureReasons: [], confidence: 1.0, fastPath: true };
    }

    // Check for confidence indicators
    const lowConfidenceIndicators = [
      /i think/i,
      /i believe/i,
      /probably/i,
      /might be/i,
      /could be/i,
      /not sure/i,
    ];

    const hasLowConfidence = lowConfidenceIndicators.some(pattern => pattern.test(response));

    if (hasLowConfidence) {
      return {
        passed: true, // Don't fail, but lower confidence
        score: 0.7,
        failureReasons: [],
        confidence: 0.5,
      };
    }

    return { passed: true, score: 1.0, failureReasons: [], confidence: 0.9, fastPath: true };
  }

  /**
   * ULTRA FAST: Aggregate multiple check results
   * Uses weighted average for final score
   */
  private aggregateChecks(checks: EvaluationResult[]): EvaluationResult {
    const weights = {
      repetition: 0.3,
      nonsense: 0.3,
      factual: 0.2,
      length: 0.1,
      evidence: 0.1,
    };

    let totalScore = 0;
    let totalWeight = 0;
    const allFailureReasons: string[] = [];
    let allPassed = true;

    for (let i = 0; i < checks.length; i++) {
      const check = checks[i];
      const weight = Object.values(weights)[i];

      totalScore += check.score * weight;
      totalWeight += weight;

      if (!check.passed) {
        allPassed = false;
        allFailureReasons.push(...check.failureReasons);
      }
    }

    const finalScore = totalScore / totalWeight;
    const passed = allPassed && finalScore >= 0.7;

    return {
      passed,
      score: finalScore,
      failureReasons: allFailureReasons,
      confidence: Math.min(...checks.map(c => c.confidence)),
    };
  }

  /**
   * INSTANT: Pre-validate before expensive inference
   * Returns null if validation passes, error string if fails
   */
  preValidate(userInput: string): string | null {
    if (!userInput || userInput.trim().length === 0) {
      return 'Empty input';
    }

    if (userInput.length > 1000) {
      return 'Input too long';
    }

    return null;
  }
}
