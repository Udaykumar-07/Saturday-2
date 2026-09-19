/**
 * Share Capability — uses React Native Share API.
 * Risk: low — opens system share sheet, user controls final action.
 */

import { ActionResult, Capability, CapabilityDefinition } from '../core/types/action';
import { Share } from 'react-native';

const definition: CapabilityDefinition = {
  id: 'share',
  name: 'Share',
  category: 'communication',
  riskLevel: 'low',
  requiredPermissions: [],
  platform: 'any',
};

export class ShareCapability implements Capability {
  readonly definition = definition;

  async execute(params: Record<string, unknown>): Promise<ActionResult> {
    const message = params.message as string | undefined;
    if (!message) {
      return { success: false, error: 'Missing message parameter.' };
    }
    try {
      const result = await Share.share({
        title: (params.title as string) || undefined,
        message,
        url: (params.url as string) || undefined,
      });
      return { success: true, data: { action: result.action } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Share failed' };
    }
  }

  async isAvailable(): Promise<boolean> { return true; }
}
