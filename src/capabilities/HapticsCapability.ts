/**
 * Haptics Capability — triggers haptic feedback via expo-haptics.
 * Risk: low — only vibration feedback.
 */

import { ActionResult, Capability, CapabilityDefinition } from '../core/types/action';
import * as Haptics from 'expo-haptics';

const definition: CapabilityDefinition = {
  id: 'device.haptics',
  name: 'Haptic Feedback',
  category: 'device',
  riskLevel: 'low',
  requiredPermissions: [],
  platform: 'any',
};

export class HapticsCapability implements Capability {
  readonly definition = definition;

  async execute(params: Record<string, unknown>): Promise<ActionResult> {
    const style = (params.style as string) || 'medium';
    try {
      switch (style) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      return { success: true, data: { style } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Haptics failed' };
    }
  }

  async isAvailable(): Promise<boolean> { return true; }
}
