/**
 * Device Info Capability — reads device metadata (battery, network, model).
 * Risk: low — read-only device information.
 */

import { ActionResult, Capability, CapabilityDefinition } from '../core/types/action';
import { NativeBridge } from '../native/NativeBridge';

const definition: CapabilityDefinition = {
  id: 'device.info',
  name: 'Device Info',
  category: 'device',
  riskLevel: 'low',
  requiredPermissions: [],
  platform: 'android',
};

export class DeviceInfoCapability implements Capability {
  readonly definition = definition;

  async execute(_params: Record<string, unknown>): Promise<ActionResult> {
    try {
      const info = await NativeBridge.getDeviceInfo();
      return {
        success: true,
        data: info as unknown as Record<string, unknown>,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get device info',
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
