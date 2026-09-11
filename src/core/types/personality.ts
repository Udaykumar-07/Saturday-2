/**
 * Personality types for Saturday.
 * The personality layer is separate from the LLM and defines
 * how Saturday communicates with the user.
 */

export type VerbosityLevel = 'concise' | 'balanced' | 'detailed';
export type ToneLevel = 'casual' | 'neutral' | 'professional';
export type InitiativeLevel = 'low' | 'balanced' | 'high';

export interface PersonalityProfile {
  /** How verbose Saturday's responses are */
  verbosity: VerbosityLevel;
  /** Communication tone */
  tone: ToneLevel;
  /** How proactively Saturday offers suggestions */
  initiative: InitiativeLevel;
  /** User's preferred name (if provided) */
  userName?: string;
}

/**
 * Default personality: calm, capable, concise, helpful.
 */
export const DEFAULT_PERSONALITY: PersonalityProfile = {
  verbosity: 'concise',
  tone: 'neutral',
  initiative: 'balanced',
};
