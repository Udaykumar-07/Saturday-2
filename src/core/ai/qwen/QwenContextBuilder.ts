/**
 * Qwen Context Builder — prepares minimal, relevant context for Qwen 2.5 inference.
 * Extracts only relevant preferences and user profile facts instead of dumping
 * the entire memory store into the context window.
 */

import { Message } from '../../types/conversation';
import { AIContext } from '../../types/context';
import { Memory } from '../../types/memory';

export interface QwenPromptContext {
  systemPrompt: string;
  modelHeader: string;
  userProfile?: string;
  currentRequest: string;
  fullPrompt: string;
}

export class QwenContextBuilder {
  /**
   * Build structured prompt for Qwen.
   */
  static buildPrompt(
    messages: Message[],
    context?: AIContext,
    modelName = 'Qwen 2.5 0.5B Instruct'
  ): QwenPromptContext {
    const lastMessage = messages[messages.length - 1];
    const currentRequest = lastMessage?.content?.trim() || '';

    const systemPrompt =
      context?.systemPrompt || 'You are Saturday, a personal AI assistant running locally on-device.';

    const modelHeader = `MODEL:\n${modelName}`;

    // Filter relevant memories matching current request
    const relevantMemories = this.filterRelevantMemories(currentRequest, context?.memories || []);

    let userProfile = '';
    if (relevantMemories.length > 0) {
      userProfile = 'USER PROFILE:\nRelevant preferences:\n' +
        relevantMemories.map((m) => `- ${this.formatMemoryBullet(m)}`).join('\n');
    }

    const sections: string[] = [
      `SYSTEM:\n${systemPrompt}`,
      modelHeader,
    ];

    if (userProfile) {
      sections.push(userProfile);
    }

    // Include recent conversational turns (up to 3) if available
    const recentMessages = messages.slice(-4, -1);
    if (recentMessages.length > 0) {
      const history = recentMessages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');
      sections.push(`CONVERSATION HISTORY:\n${history}`);
    }

    sections.push(`CURRENT REQUEST:\n${currentRequest}`);

    return {
      systemPrompt,
      modelHeader,
      userProfile: userProfile || undefined,
      currentRequest,
      fullPrompt: sections.join('\n\n'),
    };
  }

  /**
   * Find only memories that share keywords or semantic overlap with the request.
   */
  private static filterRelevantMemories(request: string, memories: Memory[]): Memory[] {
    const reqLower = request.toLowerCase();
    const reqWords = new Set(reqLower.split(/\W+/).filter((w) => w.length > 3));

    // For general greetings, include initial memories to personalize response
    if (/^(hi|hello|hey|good\s+(morning|afternoon|evening))\b/i.test(reqLower)) {
      return memories.slice(0, 2);
    }

    return memories.filter((m) => {
      const keyLower = m.key.toLowerCase();
      const valLower = m.value.toLowerCase();

      // If user asks about movies/preferences, include movie preferences
      if (
        (reqLower.includes('movie') || reqLower.includes('film')) &&
        (keyLower.includes('movie') || valLower.includes('movie'))
      ) {
        return true;
      }

      // If user asks "what do you know about me", or general identity
      if (reqLower.includes('about me') || reqLower.includes('who am i')) {
        return true;
      }

      // Word intersection
      for (const word of reqWords) {
        if (keyLower.includes(word) || valLower.includes(word)) {
          return true;
        }
      }

      return false;
    });
  }

  private static formatMemoryBullet(memory: Memory): string {
    if (memory.key.includes('preference')) {
      return `User likes ${memory.value}`;
    }
    if (memory.key === 'user.name') {
      return `User name is ${memory.value}`;
    }
    return `${memory.key}: ${memory.value}`;
  }
}
