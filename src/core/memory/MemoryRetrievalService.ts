/**
 * Memory Retrieval Service for Saturday.
 *
 * Handles semantic resolution of user questions about personal facts,
 * preferences, and memories, formulating deterministic and instant local responses.
 */

import { Memory } from '../types/memory';
import { MemoryService } from '../../services/MemoryService';
import { PersonalityService } from '../../services/PersonalityService';

export interface MemoryQueryResult {
  found: boolean;
  answer: string;
  memoryKey?: string;
  memoryValue?: string;
}

export class MemoryRetrievalService {
  constructor(
    private memoryService: MemoryService,
    private personalityService?: PersonalityService
  ) {}

  /**
   * Determine whether the input is a memory query.
   */
  isMemoryQuery(input: string): boolean {
    const lower = input.toLowerCase().trim();

    // Name queries
    if (
      /^(?:what(?:'s|\s+is)\s+my\s+name|who\s+am\s+i|what\s+should\s+you\s+call\s+me|what\s+do\s+you\s+call\s+me|do\s+you\s+(?:remember|know)\s+my\s+name|tell\s+me\s+my\s+name)[\?!\.]*$/i.test(
        lower
      )
    ) {
      return true;
    }

    // Memory list queries
    if (
      /^(?:what\s+do\s+you\s+remember(?:\s+about\s+me)?|what\s+do\s+you\s+know\s+about\s+me|what\s+memories\s+do\s+you\s+have|list\s+my\s+memories|show\s+memories)[\?!\.]*$/i.test(
        lower
      )
    ) {
      return true;
    }

    // Compound preference queries (e.g. "What movies and music I prefer", "What movies and music do I like?")
    if (
      (lower.includes('movie') || lower.includes('film')) &&
      (lower.includes('music') || lower.includes('song')) &&
      (lower.includes('prefer') || lower.includes('like') || lower.includes('what'))
    ) {
      return true;
    }

    // Specific preference queries (e.g. "What kind of movies do I like?", "What movies do I like?", "What is my favorite language?")
    if (
      /^(?:what\s+(?:kind\s+of\s+)?(?:movies?|films?|music|food|books?)\s+(?:do\s+i\s+)?(?:like|prefer|enjoy)|what\s+do\s+i\s+(?:like|prefer|enjoy)|what\s+is\s+my\s+favorite|do\s+i\s+prefer|what\s+ui\s+preference|what\s+theme\s+do\s+i)/i.test(
        lower
      )
    ) {
      return true;
    }

    return false;
  }

  /**
   * Answer a memory query directly from stored memory.
   */
  async answerQuery(input: string): Promise<MemoryQueryResult> {
    const lower = input.toLowerCase().trim();

    // ── 1. Name query ──
    if (this.isNameQuery(lower)) {
      return this.handleNameQuery();
    }

    // ── 2. Memory list query ──
    if (this.isListQuery(lower)) {
      return this.handleListQuery();
    }

    // ── 3. Preference query ──
    return this.handlePreferenceQuery(lower);
  }

  /**
   * Directly get the user's name if known.
   */
  async getUserName(): Promise<string | null> {
    // 1. Check MemoryService for 'user.name'
    const memories = await this.memoryService.search({ query: 'user.name' });
    const nameMem = memories.find((m) => m.key === 'user.name');
    if (nameMem && nameMem.value) {
      return nameMem.value;
    }

    // 2. Check PersonalityService userName
    if (this.personalityService) {
      const profile = await this.personalityService.getProfile();
      if (profile.userName) {
        return profile.userName;
      }
    }

    return null;
  }

  private isNameQuery(lower: string): boolean {
    return (
      lower.includes('my name') ||
      lower.includes('who am i') ||
      lower.includes('call me')
    );
  }

  private isListQuery(lower: string): boolean {
    return (
      lower.includes('remember about me') ||
      lower.includes('know about me') ||
      lower.includes('memories') ||
      lower.includes('list memories')
    );
  }

  private async handleNameQuery(): Promise<MemoryQueryResult> {
    const name = await this.getUserName();

    if (name) {
      return {
        found: true,
        answer: `Your name is ${name}.`,
        memoryKey: 'user.name',
        memoryValue: name,
      };
    }

    return {
      found: false,
      answer: "I don't have your name saved yet. What should I call you?",
      memoryKey: 'user.name',
    };
  }

  private async handleListQuery(): Promise<MemoryQueryResult> {
    const all = await this.memoryService.search();

    // Deduplicate by key, taking newest
    const uniqueMap = new Map<string, Memory>();
    for (const m of all) {
      if (!uniqueMap.has(m.key) || m.updatedAt > (uniqueMap.get(m.key)?.updatedAt ?? 0)) {
        uniqueMap.set(m.key, m);
      }
    }

    const uniqueMemories = Array.from(uniqueMap.values());

    if (uniqueMemories.length === 0) {
      return {
        found: false,
        answer: "I don't have any memories saved about you yet.",
      };
    }

    const items = uniqueMemories
      .map((m) => {
        const readableKey = m.key.replace(/^user\./, '').replace(/\./g, ' ');
        return `• **${readableKey}**: ${m.value}`;
      })
      .join('\n');

    return {
      found: true,
      answer: `Here is what I remember about you:\n\n${items}`,
    };
  }

  private async handlePreferenceQuery(lower: string): Promise<MemoryQueryResult> {
    const preferences = await this.memoryService.getByCategory('preferences');

    // Check compound queries (e.g. "What movies and music I prefer")
    if (
      (lower.includes('movie') || lower.includes('film')) &&
      (lower.includes('music') || lower.includes('song'))
    ) {
      const moviePref = preferences.find(
        (p) => p.key.includes('movie') || p.key.includes('film') || p.value.toLowerCase().includes('movie')
      );
      const musicPref = preferences.find(
        (p) => p.key.includes('music') || p.key.includes('song') || p.value.toLowerCase().includes('music')
      );

      if (moviePref && !musicPref) {
        return {
          found: true,
          answer: `You prefer ${moviePref.value}. I don't have any music preferences saved for you yet.`,
          memoryKey: moviePref.key,
          memoryValue: moviePref.value,
        };
      } else if (!moviePref && musicPref) {
        return {
          found: true,
          answer: `You prefer ${musicPref.value}. I don't have any movie preferences saved for you yet.`,
          memoryKey: musicPref.key,
          memoryValue: musicPref.value,
        };
      } else if (moviePref && musicPref) {
        return {
          found: true,
          answer: `You prefer ${moviePref.value} and ${musicPref.value}.`,
          memoryKey: `${moviePref.key},${musicPref.key}`,
          memoryValue: `${moviePref.value}, ${musicPref.value}`,
        };
      }
      return {
        found: false,
        answer: "I don't have your movie or music preferences saved yet.",
      };
    }

    // Check theme
    if (lower.includes('theme') || lower.includes('dark mode') || lower.includes('light mode')) {
      const theme = preferences.find((p) => p.key.includes('theme'));
      if (theme) {
        return {
          found: true,
          answer: `You prefer ${theme.value}.`,
          memoryKey: theme.key,
          memoryValue: theme.value,
        };
      }
    }

    // Check movies / films
    if (lower.includes('movie') || lower.includes('film')) {
      const moviePref = preferences.find(
        (p) => p.key.includes('movie') || p.key.includes('film') || p.value.toLowerCase().includes('movie')
      );
      if (moviePref) {
        return {
          found: true,
          answer: `You like ${moviePref.value}.`,
          memoryKey: moviePref.key,
          memoryValue: moviePref.value,
        };
      }
    }

    // Check music
    if (lower.includes('music') || lower.includes('song')) {
      const musicPref = preferences.find(
        (p) => p.key.includes('music') || p.key.includes('song') || p.value.toLowerCase().includes('music')
      );
      if (musicPref) {
        return {
          found: true,
          answer: `You like ${musicPref.value}.`,
          memoryKey: musicPref.key,
          memoryValue: musicPref.value,
        };
      }
    }

    // Check favorite
    const favMatch = lower.match(/favorite\s+([a-z\s]+)/i);
    if (favMatch) {
      const topic = favMatch[1].trim().replace(/\s+/g, '_');
      const match = preferences.find((p) => p.key.includes(topic));
      if (match) {
        return {
          found: true,
          answer: `Your favorite ${favMatch[1].trim()} is ${match.value}.`,
          memoryKey: match.key,
          memoryValue: match.value,
        };
      }
    }

    return {
      found: false,
      answer: "I don't have that preference saved yet.",
    };
  }
}
