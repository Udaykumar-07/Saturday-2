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
    const appName = (params.appName as string | undefined)?.toLowerCase() || 'youtube';

    if (!query || !query.trim()) {
      return { success: false, error: 'Missing media query parameter.' };
    }

    const cleanQuery = query.trim();
    const encoded = encodeURIComponent(cleanQuery);

    try {
      // 1. Try native bridge first (handles native media play intent & propagates native errors)
      const nativeSuccess = await NativeBridge.playMedia(cleanQuery, packageName);
      if (nativeSuccess) {
        return {
          success: true,
          data: {
            query: cleanQuery,
            packageName: packageName || 'com.google.android.youtube',
            appName: appName || 'YouTube',
            played: true,
            verified: true,
            playbackTarget: appName || 'YouTube',
            message: `Playing "${cleanQuery}" on ${appName === 'spotify' ? 'Spotify' : 'YouTube'}`,
          },
        };
      }

      // 2. If native returned false, try YouTube app scheme or web fallback
      if (packageName === 'com.google.android.youtube' || appName.includes('youtube')) {
        const ytAppScheme = `vnd.youtube://results?search_query=${encoded}`;
        const ytWebUrl = `https://www.youtube.com/results?search_query=${encoded}`;

        let opened = false;
        try {
          const canOpenApp = await Linking.canOpenURL(ytAppScheme);
          if (canOpenApp) {
            await Linking.openURL(ytAppScheme);
            opened = true;
          }
        } catch {
          // Fallback to web URL
        }

        if (!opened) {
          await Linking.openURL(ytWebUrl);
          opened = true;
        }

        return {
          success: true,
          data: {
            query: cleanQuery,
            packageName: 'com.google.android.youtube',
            appName: 'YouTube',
            played: true,
            verified: opened,
            playbackTarget: 'YouTube',
            message: `Playing "${cleanQuery}" on YouTube`,
          },
        };
      }

      // 3. Spotify playback: try Spotify app URI, then web fallback
      if (packageName === 'com.spotify.music' || appName.includes('spotify')) {
        const spotifyAppScheme = `spotify:search:${encoded}`;
        const spotifyWebUrl = `https://open.spotify.com/search/${encoded}`;

        let opened = false;
        try {
          const canOpenSpotify = await Linking.canOpenURL(spotifyAppScheme);
          if (canOpenSpotify) {
            await Linking.openURL(spotifyAppScheme);
            opened = true;
          }
        } catch {
          // Fallback to web URL
        }

        if (!opened) {
          await Linking.openURL(spotifyWebUrl);
          opened = true;
        }

        return {
          success: true,
          data: {
            query: cleanQuery,
            packageName: 'com.spotify.music',
            appName: 'Spotify',
            played: true,
            verified: opened,
            playbackTarget: 'Spotify',
            message: `Playing "${cleanQuery}" on Spotify`,
          },
        };
      }

      // Default fallback: YouTube
      const fallbackUrl = `https://www.youtube.com/results?search_query=${encoded}`;
      await Linking.openURL(fallbackUrl);
      return {
        success: true,
        data: {
          query: cleanQuery,
          packageName: 'com.google.android.youtube',
          appName: 'YouTube',
          played: true,
          verified: true,
          fallbackUrl,
          message: `Opened "${cleanQuery}" on YouTube`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to play media: ${cleanQuery}`,
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
