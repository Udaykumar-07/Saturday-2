/**
 * URL Open Capability — opens URLs via Android intent system.
 * Risk: medium — navigates to external content.
 */

import { ActionResult, Capability, CapabilityDefinition } from '../core/types/action';
import { Linking } from 'react-native';

const definition: CapabilityDefinition = {
  id: 'url.open',
  name: 'Open URL',
  category: 'app',
  riskLevel: 'medium',
  requiredPermissions: [],
  platform: 'any',
};

export class UrlOpenCapability implements Capability {
  readonly definition = definition;

  async execute(params: Record<string, unknown>): Promise<ActionResult> {
    const url = params.url as string | undefined;
    if (!url) {
      return { success: false, error: 'Missing url parameter.' };
    }

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        return { success: false, error: `Cannot open URL: ${url}` };
      }
      await Linking.openURL(url);
      return { success: true, data: { url, opened: true } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to open ${url}`,
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
