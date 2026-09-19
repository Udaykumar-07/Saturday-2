/**
 * App Launch Capability — launches an Android app by package name.
 * Risk: low — only opens apps, doesn't modify data.
 */

import { ActionResult, Capability, CapabilityDefinition } from '../core/types/action';
import { NativeBridge } from '../native/NativeBridge';

const definition: CapabilityDefinition = {
  id: 'app.launch',
  name: 'Launch App',
  category: 'app',
  riskLevel: 'low',
  requiredPermissions: [],
  platform: 'android',
};

export class AppLaunchCapability implements Capability {
  readonly definition = definition;

  async execute(params: Record<string, unknown>): Promise<ActionResult> {
    const packageName = params.packageName as string | undefined;
    if (!packageName) {
      return { success: false, error: 'Missing packageName parameter.' };
    }

    try {
      await NativeBridge.launchApp(packageName);
      return {
        success: true,
        data: { packageName, launched: true },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to launch ${packageName}`,
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
