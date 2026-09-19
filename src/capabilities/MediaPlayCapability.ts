/**
 * Media Play Capability — plays songs, artists, or videos via Android MediaPlay intent.
 * Risk: low — opens media playback in user's media app.
 */

import { ActionResult, Capability, CapabilityDefinition } from '../core/types/action';
import { NativeBridge } from '../native/NativeBridge';
import { Linking } from 'react-native';

const definition: CapabilityDefinition = {
  id: 'media.play',
  name: 'Play Media',
  category: 'app',
  riskLevel: 'low',
  requiredPermissions: [],
  platform: 'any',
};

export class MediaPlayCapability implements Capability {
  readonly definition = definition;

  async execute(params: Record<string, unknown>): Promise<ActionResult> {
    const query = params.query as string | undefined;
    const packageName = params.packageName as string | undefined;
    const appName = params.appName as string | undefined;

    if (!query || !query.trim()) {
      return { success: false, error: 'Missing media query parameter.' };
    }

    try {
      const success = await NativeBridge.playMedia(query.trim(), packageName);
      if (success) {
        return {
          success: true,
          data: {
            query: query.trim(),
            packageName,
            appName,
            played: true,
          },
        };
      }

      // Fallback for YouTube web URL if native media play returned false
      if (packageName === 'com.google.android.youtube') {
        const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
        await Linking.openURL(ytUrl);
        return {
          success: true,
          data: {
            query: query.trim(),
            packageName,
            appName,
            fallbackUrl: ytUrl,
          },
        };
      }

      return {
        success: false,
        error: `Could not play media for "${query}"`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to play media: ${query}`,
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
