/**
 * Capability Taxonomy for Saturday Intelligence System.
 *
 * Normalizes, categorizes, and matches capabilities across models,
 * agents, tools, APIs, and local actions.
 */

import { IntelligenceCapabilityId, IntelligenceCapabilityCategory } from '../../core/types/intelligence';

/**
 * Standard capability identifiers.
 */
export const CAPABILITIES = {
  // Generation & Text
  TEXT_GENERATION: 'TEXT_GENERATION',
  SUMMARIZATION: 'SUMMARIZATION',
  TRANSLATION: 'TRANSLATION',

  // Reasoning
  REASONING: 'REASONING',
  DEEP_REASONING: 'DEEP_REASONING',
  PLANNING: 'PLANNING',

  // Coding
  CODING: 'CODING',
  DEBUGGING: 'DEBUGGING',

  // Multimodal
  VISION: 'VISION',
  IMAGE_ANALYSIS: 'IMAGE_ANALYSIS',
  AUDIO_ANALYSIS: 'AUDIO_ANALYSIS',
  TRANSCRIPTION: 'TRANSCRIPTION',

  // Research & Information
  RESEARCH: 'RESEARCH',
  WEB_SEARCH: 'WEB_SEARCH',
  WEB_BROWSING: 'WEB_BROWSING',

  // Tool & Agent Execution
  TOOL_USE: 'TOOL_USE',
  FUNCTION_CALLING: 'FUNCTION_CALLING',
  STRUCTURED_OUTPUT: 'STRUCTURED_OUTPUT',
  AGENTIC_EXECUTION: 'AGENTIC_EXECUTION',
  MULTI_STEP_EXECUTION: 'MULTI_STEP_EXECUTION',

  // Device & Local Control
  ANDROID_CONTROL: 'ANDROID_CONTROL',
  APP_MANAGEMENT: 'APP_MANAGEMENT',
  MEDIA_PLAYBACK: 'MEDIA_PLAYBACK',
  DEVICE_INFO: 'DEVICE_INFO',

  // Domain & Service Access
  EMAIL_ACCESS: 'EMAIL_ACCESS',
  CALENDAR_ACCESS: 'CALENDAR_ACCESS',
  MAPS: 'MAPS',
  SHOPPING: 'SHOPPING',
  BOOKING: 'BOOKING',
  DOCUMENT_ANALYSIS: 'DOCUMENT_ANALYSIS',
  PRIVATE_DATA_PROCESSING: 'PRIVATE_DATA_PROCESSING',
} as const;

/**
 * Category mappings for known capabilities.
 */
const CAPABILITY_CATEGORY_MAP: Record<string, IntelligenceCapabilityCategory> = {
  TEXT_GENERATION: 'generation',
  SUMMARIZATION: 'generation',
  TRANSLATION: 'generation',

  REASONING: 'reasoning',
  DEEP_REASONING: 'reasoning',
  PLANNING: 'reasoning',

  CODING: 'coding',
  DEBUGGING: 'coding',

  VISION: 'media',
  IMAGE_ANALYSIS: 'media',
  AUDIO_ANALYSIS: 'media',
  TRANSCRIPTION: 'media',

  RESEARCH: 'research',
  WEB_SEARCH: 'research',
  WEB_BROWSING: 'research',

  TOOL_USE: 'tools',
  FUNCTION_CALLING: 'tools',
  STRUCTURED_OUTPUT: 'tools',
  AGENTIC_EXECUTION: 'tools',
  MULTI_STEP_EXECUTION: 'tools',

  ANDROID_CONTROL: 'device',
  APP_MANAGEMENT: 'device',
  MEDIA_PLAYBACK: 'device',
  DEVICE_INFO: 'device',

  EMAIL_ACCESS: 'communication',
  CALENDAR_ACCESS: 'services',
  MAPS: 'services',
  SHOPPING: 'services',
  BOOKING: 'services',
  DOCUMENT_ANALYSIS: 'services',
  PRIVATE_DATA_PROCESSING: 'privacy',
};

/**
 * Legacy Phase 2 / Phase 3 capability aliases mapping to normalized IDs.
 */
const CAPABILITY_ALIASES: Record<string, string> = {
  'chat': CAPABILITIES.TEXT_GENERATION,
  'general': CAPABILITIES.TEXT_GENERATION,
  'text': CAPABILITIES.TEXT_GENERATION,

  'reasoning': CAPABILITIES.REASONING,
  'model.reasoning': CAPABILITIES.REASONING,
  'deep_reasoning': CAPABILITIES.DEEP_REASONING,

  'app.launch': CAPABILITIES.APP_MANAGEMENT,
  'app.discovery': CAPABILITIES.APP_MANAGEMENT,
  'url.open': CAPABILITIES.ANDROID_CONTROL,
  'device.info': CAPABILITIES.DEVICE_INFO,
  'device.haptics': CAPABILITIES.ANDROID_CONTROL,
  'device.share': CAPABILITIES.ANDROID_CONTROL,
  'clipboard.read': CAPABILITIES.ANDROID_CONTROL,
  'clipboard.write': CAPABILITIES.ANDROID_CONTROL,
  'media.play': CAPABILITIES.MEDIA_PLAYBACK,

  'gmail.read_latest': CAPABILITIES.EMAIL_ACCESS,
  'gmail.search': CAPABILITIES.EMAIL_ACCESS,
  'gmail.is_connected': CAPABILITIES.EMAIL_ACCESS,

  'agent.research': CAPABILITIES.RESEARCH,
  'web.search': CAPABILITIES.WEB_SEARCH,
  'web.browse': CAPABILITIES.WEB_BROWSING,
};

/**
 * Capability implication graph: if provider has Key, it also satisfies Value.
 */
const CAPABILITY_IMPLICATIONS: Record<string, string[]> = {
  [CAPABILITIES.DEEP_REASONING]: [CAPABILITIES.REASONING, CAPABILITIES.TEXT_GENERATION],
  [CAPABILITIES.REASONING]: [CAPABILITIES.TEXT_GENERATION],
  [CAPABILITIES.CODING]: [CAPABILITIES.TEXT_GENERATION],
  [CAPABILITIES.DEBUGGING]: [CAPABILITIES.CODING, CAPABILITIES.REASONING],
  [CAPABILITIES.RESEARCH]: [CAPABILITIES.WEB_SEARCH, CAPABILITIES.SUMMARIZATION, CAPABILITIES.TEXT_GENERATION],
  [CAPABILITIES.WEB_BROWSING]: [CAPABILITIES.WEB_SEARCH],
  [CAPABILITIES.AGENTIC_EXECUTION]: [CAPABILITIES.TOOL_USE, CAPABILITIES.PLANNING, CAPABILITIES.MULTI_STEP_EXECUTION],
  [CAPABILITIES.ANDROID_CONTROL]: [CAPABILITIES.APP_MANAGEMENT, CAPABILITIES.DEVICE_INFO, CAPABILITIES.MEDIA_PLAYBACK],
};

/**
 * Normalize an arbitrary capability string (e.g. "app.launch" -> "APP_MANAGEMENT").
 */
export function normalizeCapability(raw: string): string {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  if (CAPABILITY_ALIASES[lower]) {
    return CAPABILITY_ALIASES[lower];
  }

  const upper = trimmed.toUpperCase().replace(/[\s.-]+/g, '_');
  if (CAPABILITY_CATEGORY_MAP[upper]) {
    return upper;
  }

  return upper;
}

/**
 * Determine the category for a capability.
 */
export function getCapabilityCategory(capabilityId: string): IntelligenceCapabilityCategory {
  const normalized = normalizeCapability(capabilityId);
  return CAPABILITY_CATEGORY_MAP[normalized] || 'tools';
}

/**
 * Check if a provided capability satisfies a required capability.
 * Supports exact match, alias match, and capability hierarchy implications.
 */
export function isCapabilityMatch(required: string, provided: string): boolean {
  const normRequired = normalizeCapability(required);
  const normProvided = normalizeCapability(provided);

  if (normRequired === normProvided) {
    return true;
  }

  // Check implications: does `provided` imply `required`?
  const implied = CAPABILITY_IMPLICATIONS[normProvided];
  if (implied && implied.includes(normRequired)) {
    return true;
  }

  return false;
}

/**
 * Calculate the coverage score of provided capabilities against a list of required capabilities.
 * Returns a score between 0 and 1.
 */
export function calculateCapabilityCoverage(
  required: string[],
  provided: string[]
): number {
  if (required.length === 0) return 1.0;
  if (provided.length === 0) return 0.0;

  let matchedCount = 0;
  for (const req of required) {
    const isMatched = provided.some((prov) => isCapabilityMatch(req, prov));
    if (isMatched) {
      matchedCount++;
    }
  }

  return matchedCount / required.length;
}
