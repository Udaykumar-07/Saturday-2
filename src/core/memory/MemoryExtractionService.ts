/**
 * Memory Extraction Service for Saturday.
 *
 * Deterministically analyzes user messages to identify, normalize, and extract
 * durable personal facts, preferences, and user instructions BEFORE response generation.
 * Prevents saving ephemeral state (e.g., "I'm hungry right now") as permanent memory.
 */

import { MemoryCandidate } from '../types/memory';

const NON_NAME_ADJECTIVES = new Set([
  'hungry', 'tired', 'fine', 'good', 'ready', 'here', 'back', 'working',
  'sorry', 'happy', 'sad', 'curious', 'confused', 'bored', 'busy', 'lost',
  'done', 'finished', 'leaving', 'going', 'coming', 'trying', 'thinking',
  'wondering', 'asking', 'checking', 'looking', 'testing', 'learning',
  'a user', 'an ai', 'human', 'not sure',
]);

export class MemoryExtractionService {
  /**
   * Extract memory candidates from user input.
   */
  extract(message: string): MemoryCandidate[] {
    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();
    const candidates: MemoryCandidate[] = [];

    // ── 1. Name Extraction ──
    const nameCandidate = this.extractName(trimmed, lower);
    if (nameCandidate) {
      candidates.push(nameCandidate);
      return candidates; // High-priority extraction
    }

    // ── 2. Explicit "Remember that X is Y" or "Remember: X" ──
    const explicitRemember = this.extractExplicitRemember(trimmed);
    if (explicitRemember) {
      candidates.push(explicitRemember);
      return candidates;
    }

    // ── 3. Preferences (e.g., "I prefer dark mode", "My favorite programming language is TypeScript") ──
    const preferenceCandidate = this.extractPreference(trimmed, lower);
    if (preferenceCandidate) {
      candidates.push(preferenceCandidate);
      return candidates;
    }

    return candidates;
  }

  /**
   * Extract user name from natural language variations.
   * Supports:
   * - "My name is Uday"
   * - "My name's uk"
   * - "Hey my name is uk"
   * - "Call me Uday"
   * - "Call me Kumar instead"
   * - "You can call me Alex"
   * - "I am Uday" / "I'm Uday"
   * - "I prefer to be called Uday"
   * - "Remember that my name is Uday"
   */
  private extractName(text: string, lower: string): MemoryCandidate | null {
    // 1. "My name is X" / "My name's X" / "Remember my name is X"
    const myNameMatch = text.match(
      /(?:(?:hey|hi|hello|please|and)\s+)?(?:remember\s+(?:that\s+)?)?my\s+name(?:'s|\s+is)\s+([a-zA-Z0-9_\-\s]+?)(?:[\.!\?,;]|(?:\s+(?:and|please|thanks|now|here))|$)/i
    );
    if (myNameMatch) {
      const rawName = this.cleanExtractedValue(myNameMatch[1]);
      if (rawName && rawName.length > 0 && rawName.length < 50) {
        return {
          type: 'PERSONAL_FACT',
          key: 'user.name',
          value: rawName,
          confidence: 1.0,
          source: 'user_stated',
          category: 'facts',
        };
      }
    }

    // 2. "Call me X" / "Call me X instead" / "You can call me X" / "I prefer to be called X"
    const callMeMatch = text.match(
      /(?:(?:hey|hi|hello|please|you\s+can|just|from\s+now\s+on)\s+)?(?:call\s+me|i\s+prefer\s+to\s+be\s+called)\s+([a-zA-Z0-9_\-\s]+?)(?:\s+instead)?(?:[\.!\?,;]|$)/i
    );
    if (callMeMatch) {
      const rawName = this.cleanExtractedValue(callMeMatch[1]);
      if (rawName && rawName.length > 0 && rawName.length < 50) {
        return {
          type: 'PERSONAL_FACT',
          key: 'user.name',
          value: rawName,
          confidence: 1.0,
          source: 'user_stated',
          category: 'facts',
        };
      }
    }

    // 3. "I am X" / "I'm X" (filter out transient adjectives: "I am hungry", "I'm tired")
    const iAmMatch = text.match(
      /^(?:(?:hey|hi|hello)\s*,?\s*)?(?:i\s+am|i'm)\s+([a-zA-Z0-9_\-]+)(?:[\.!\?,]|$)/i
    );
    if (iAmMatch) {
      const rawName = this.cleanExtractedValue(iAmMatch[1]);
      if (rawName && !NON_NAME_ADJECTIVES.has(rawName.toLowerCase())) {
        return {
          type: 'PERSONAL_FACT',
          key: 'user.name',
          value: rawName,
          confidence: 0.95,
          source: 'user_stated',
          category: 'facts',
        };
      }
    }

    return null;
  }

  /**
   * Extract explicit directives: "Remember that X is Y", "Remember my project is called Saturday".
   */
  private extractExplicitRemember(text: string): MemoryCandidate | null {
    const match = text.match(
      /^(?:please\s+)?remember\s+(?:that\s+)?(.+?)\s+(?:is\s+called|is\s+named|is|called|named|are)\s+(.+?)(?:[\.!\?]|$)/i
    );
    if (match) {
      const subject = match[1].trim();
      const predicate = this.cleanExtractedValue(match[2]);

      // Normalize key
      let key = subject.toLowerCase().replace(/^(my|the)\s+/, '').replace(/\s+/g, '.');
      if (key === 'project') key = 'project.name';

      return {
        type: 'USER_INSTRUCTION',
        key,
        value: predicate,
        confidence: 1.0,
        source: 'user_stated',
        category: 'facts',
      };
    }

    return null;
  }

  /**
   * Extract preferences (theme, language, os, devices).
   */
  private extractPreference(text: string, lower: string): MemoryCandidate | null {
    // "My favorite <X> is <Y>"
    const favMatch = text.match(/my\s+favorite\s+([a-zA-Z\s]+?)\s+is\s+([a-zA-Z0-9_\-\s]+?)(?:[\.!\?]|$)/i);
    if (favMatch) {
      const topic = favMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
      const val = this.cleanExtractedValue(favMatch[2]);
      return {
        type: 'PREFERENCE',
        key: `user.preference.${topic}`,
        value: val,
        confidence: 1.0,
        source: 'user_stated',
        category: 'preferences',
      };
    }

    // "I prefer <X>" (e.g. "I prefer dark mode", "I prefer concise answers")
    const preferMatch = text.match(/i\s+prefer\s+([a-zA-Z0-9_\-\s]+?)(?:[\.!\?]|$)/i);
    if (preferMatch) {
      const val = this.cleanExtractedValue(preferMatch[1]);
      let key = 'user.preference.general';
      if (val.toLowerCase().includes('dark') || val.toLowerCase().includes('light')) {
        key = 'user.preference.theme';
      } else if (val.toLowerCase().includes('concise') || val.toLowerCase().includes('detailed')) {
        key = 'user.preference.verbosity';
      }

      return {
        type: 'PREFERENCE',
        key,
        value: val,
        confidence: 0.95,
        source: 'user_stated',
        category: 'preferences',
      };
    }

    // "I like <X>" / "I love <X>" / "I enjoy <X>" (e.g. "I like biblical movies")
    const likeMatch = text.match(/^(?:remember\s+(?:that\s+)?)?i\s+(like|love|enjoy)\s+([a-zA-Z0-9_\-\s]+?)(?:[\.!\?]|$)/i);
    if (likeMatch) {
      const val = this.cleanExtractedValue(likeMatch[2]);
      const valLower = val.toLowerCase();
      // Exclude transient expressions like "I like this", "I like to go"
      if (!/^(?:that|this|it|to\s+)/i.test(valLower) && val.length > 2) {
        let key = 'user.preference.general';
        if (valLower.includes('movie') || valLower.includes('film') || valLower.includes('cinema')) {
          key = 'user.preference.movie';
        } else if (valLower.includes('music') || valLower.includes('song')) {
          key = 'user.preference.music';
        }

        return {
          type: 'PREFERENCE',
          key,
          value: val,
          confidence: 1.0,
          source: 'user_stated',
          category: 'preferences',
        };
      }
    }

    // "I use Android" / "I use Mac"
    const useMatch = text.match(/i\s+use\s+(android|ios|mac|windows|linux)(?:[\.!\?]|$)/i);
    if (useMatch) {
      return {
        type: 'PERSONAL_FACT',
        key: 'user.platform',
        value: useMatch[1].toUpperCase(),
        confidence: 0.95,
        source: 'user_stated',
        category: 'facts',
      };
    }

    return null;
  }

  /**
   * Clean up extracted name or value, trimming punctuation and excessive spaces.
   */
  private cleanExtractedValue(raw: string): string {
    return raw
      .replace(/^(?:called|named)\s+/i, '')
      .replace(/[?!.,;]+$/, '')
      .replace(/^["']|["']$/g, '')
      .trim();
  }
}
