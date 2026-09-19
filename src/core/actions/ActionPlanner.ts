/**
 * Action Planner — decomposes complex user requests into sequential action steps.
 * Phase 2: pattern-based decomposition (not LLM-powered).
 * Future: LLM-assisted multi-step planning.
 */

import { ActionIntent, ActionPlan } from '../types/action';

/** Well-known app package names for pattern matching */
const APP_PACKAGES: Record<string, string> = {
  youtube: 'com.google.android.youtube',
  chrome: 'com.android.chrome',
  gmail: 'com.google.android.gm',
  maps: 'com.google.android.apps.maps',
  photos: 'com.google.android.apps.photos',
  camera: 'com.android.camera',
  settings: 'com.android.settings',
  calculator: 'com.google.android.calculator',
  clock: 'com.google.android.deskclock',
  calendar: 'com.google.android.calendar',
  whatsapp: 'com.whatsapp',
  instagram: 'com.instagram.android',
  twitter: 'com.twitter.android',
  spotify: 'com.spotify.music',
  telegram: 'org.telegram.messenger',
};

/** Deep link templates for search operations */
const SEARCH_DEEP_LINKS: Record<string, string> = {
  'com.google.android.youtube': 'https://www.youtube.com/results?search_query=',
  'com.android.chrome': 'https://www.google.com/search?q=',
  'com.spotify.music': 'spotify:search:',
};

let intentCounter = 0;

function makeIntentId(): string {
  return `intent_${Date.now()}_${++intentCounter}`;
}

export class ActionPlanner {
  /**
   * Decompose a user request into an ActionPlan.
   * Phase 2 uses keyword pattern matching.
   */
  plan(input: string): ActionPlan | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Pattern: "open/launch <app> and search/find <query>"
    const openAndSearchMatch = trimmed.match(
      /^(?:open|launch)\s+(.+?)\s+and\s+(?:search|search for|look up|find)\s+(.+)$/i
    );
    if (openAndSearchMatch) {
      return this.planOpenAndSearch(trimmed, openAndSearchMatch[1].trim(), openAndSearchMatch[2].trim());
    }

    // Pattern: "search <query> on <app>"
    const searchOnMatch = trimmed.match(/^search\s+(.+?)\s+on\s+(.+)$/i);
    if (searchOnMatch) {
      return this.planSearchOn(trimmed, searchOnMatch[2].trim(), searchOnMatch[1].trim());
    }

    // Pattern: "play <song/video> on <app>"
    const playOnMatch = trimmed.match(/^play\s+(.+?)\s+on\s+(.+)$/i);
    if (playOnMatch) {
      return this.planPlayMedia(trimmed, playOnMatch[2].trim(), playOnMatch[1].trim());
    }

    // Pattern: "play <song/video/artist>" (default to YouTube)
    const playMatch = trimmed.match(/^play\s+(.+)$/i);
    if (playMatch) {
      return this.planPlayMedia(trimmed, 'youtube', playMatch[1].trim());
    }

    // Pattern: "open/launch <app>"
    const openMatch = trimmed.match(/^(?:open|launch)\s+(.+)$/i);
    if (openMatch) {
      return this.planSimpleOpen(trimmed, openMatch[1].trim());
    }

    return null;
  }

  private planOpenAndSearch(
    originalInput: string,
    appName: string,
    query: string
  ): ActionPlan {
    const steps: ActionIntent[] = [];
    const packageName = this.resolvePackage(appName);

    // Step 1: Launch app
    steps.push({
      id: makeIntentId(),
      capability: 'app.launch',
      params: { packageName, appName: appName.toLowerCase() },
      riskLevel: 'low',
      requiresConfirmation: false,
      description: `Open ${this.capitalize(appName)}`,
    });

    // Step 2: Search via deep link
    const deepLink = packageName ? SEARCH_DEEP_LINKS[packageName] : null;
    if (deepLink) {
      steps.push({
        id: makeIntentId(),
        capability: 'url.open',
        params: { url: `${deepLink}${encodeURIComponent(query)}` },
        riskLevel: 'low',
        requiresConfirmation: false,
        description: `Search for "${query}" on ${this.capitalize(appName)}`,
      });
    }

    return {
      steps,
      description: `Open ${this.capitalize(appName)} and search for "${query}"`,
    };
  }

  private planSimpleOpen(originalInput: string, appName: string): ActionPlan {
    const cleanName = appName.replace(/[^\w\s]/g, '').trim();
    const packageName = this.resolvePackage(appName);
    const steps: ActionIntent[] = [
      {
        id: makeIntentId(),
        capability: 'app.launch',
        params: { packageName, appName: cleanName.toLowerCase() },
        riskLevel: 'low',
        requiresConfirmation: false,
        description: `Open ${this.capitalize(cleanName)}`,
      },
    ];

    return {
      steps,
      description: `Open ${this.capitalize(cleanName)}`,
    };
  }

  private planSearchOn(
    originalInput: string,
    appName: string,
    query: string
  ): ActionPlan {
    const steps: ActionIntent[] = [];
    const packageName = this.resolvePackage(appName.trim());

    // Step 1: Launch app
    steps.push({
      id: makeIntentId(),
      capability: 'app.launch',
      params: { packageName, appName: appName.trim().toLowerCase() },
      riskLevel: 'low',
      requiresConfirmation: false,
      description: `Open ${this.capitalize(appName.trim())}`,
    });

    // Step 2: Search via deep link
    const deepLink = packageName ? SEARCH_DEEP_LINKS[packageName] : null;
    if (deepLink) {
      steps.push({
        id: makeIntentId(),
        capability: 'url.open',
        params: { url: `${deepLink}${encodeURIComponent(query)}` },
        riskLevel: 'low',
        requiresConfirmation: false,
        description: `Search for "${query}" on ${this.capitalize(appName.trim())}`,
      });
    }

    return {
      steps,
      description: originalInput,
    };
  }

  private planPlayMedia(
    originalInput: string,
    appName: string,
    query: string
  ): ActionPlan {
    const steps: ActionIntent[] = [];
    const packageName = this.resolvePackage(appName.trim());

    // Step 1: Launch app
    steps.push({
      id: makeIntentId(),
      capability: 'app.launch',
      params: { packageName, appName: appName.trim().toLowerCase() },
      riskLevel: 'low',
      requiresConfirmation: false,
      description: `Open ${this.capitalize(appName.trim())}`,
    });

    // Step 2: Media playback intent
    steps.push({
      id: makeIntentId(),
      capability: 'media.play',
      params: { query, packageName, appName: appName.trim().toLowerCase() },
      riskLevel: 'low',
      requiresConfirmation: false,
      description: `Play "${query}" on ${this.capitalize(appName.trim())}`,
    });

    return {
      steps,
      description: `Play "${query}" on ${this.capitalize(appName.trim())}`,
    };
  }

  /** Resolve a friendly app name to a package name. */
  private resolvePackage(appName: string): string | undefined {
    const normalized = appName.toLowerCase().replace(/[^\w]/g, '');
    return APP_PACKAGES[normalized];
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
