/**
 * Personality service — manages Saturday's communication style.
 * The personality layer is separate from the LLM.
 */

import { PersonalityProfile, DEFAULT_PERSONALITY } from '../core/types/personality';
import { PersonalityRepository } from '../storage/PersonalityRepository';

export class PersonalityService {
  private profile: PersonalityProfile | null = null;

  constructor(private repository: PersonalityRepository) {}

  /** Get the current personality profile. Loads from storage on first call. */
  async getProfile(): Promise<PersonalityProfile> {
    if (!this.profile) {
      this.profile = await this.repository.load();
    }
    return { ...this.profile };
  }

  /** Update the personality profile. */
  async updateProfile(
    updates: Partial<PersonalityProfile>
  ): Promise<PersonalityProfile> {
    const current = await this.getProfile();
    this.profile = { ...current, ...updates };
    await this.repository.save(this.profile);
    return { ...this.profile };
  }

  /** Reset personality to defaults. */
  async reset(): Promise<PersonalityProfile> {
    this.profile = { ...DEFAULT_PERSONALITY };
    await this.repository.save(this.profile);
    return { ...this.profile };
  }

  /**
   * Generate a system prompt that reflects Saturday's personality.
   * This is injected into AI requests.
   */
  async generateSystemPrompt(): Promise<string> {
    const p = await this.getProfile();

    const parts: string[] = [
      'You are Saturday, a personal AI assistant.',
      'You help the user get things done by figuring out the technology required.',
    ];

    // Verbosity
    switch (p.verbosity) {
      case 'concise':
        parts.push('Keep responses brief and to the point. Avoid unnecessary detail.');
        break;
      case 'balanced':
        parts.push('Provide clear, well-structured responses with appropriate detail.');
        break;
      case 'detailed':
        parts.push('Provide thorough, detailed responses with examples when helpful.');
        break;
    }

    // Tone
    switch (p.tone) {
      case 'casual':
        parts.push('Use a friendly, conversational tone.');
        break;
      case 'neutral':
        parts.push('Use a calm, clear, and helpful tone.');
        break;
      case 'professional':
        parts.push('Use a polished, professional tone.');
        break;
    }

    // Initiative
    switch (p.initiative) {
      case 'low':
        parts.push('Only answer what is asked. Do not proactively suggest things.');
        break;
      case 'balanced':
        parts.push('Offer relevant suggestions when appropriate, but stay focused on the request.');
        break;
      case 'high':
        parts.push('Proactively suggest related actions or improvements when you see opportunities.');
        break;
    }

    // User name
    if (p.userName) {
      parts.push(`The user\'s name is ${p.userName}.`);
    }

    parts.push('Never pretend an action was completed when it was not.');
    parts.push('If you cannot do something, say so clearly.');

    return parts.join(' ');
  }
}
