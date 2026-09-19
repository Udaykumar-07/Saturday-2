/**
 * Clipboard Capability — read/write clipboard via native bridge.
 * Risk: low (read) / medium (write).
 */

import { ActionResult, Capability, CapabilityDefinition } from '../core/types/action';
import { NativeBridge } from '../native/NativeBridge';

const readDef: CapabilityDefinition = {
  id: 'clipboard.read',
  name: 'Read Clipboard',
  category: 'device',
  riskLevel: 'low',
  requiredPermissions: [],
  platform: 'android',
};

const writeDef: CapabilityDefinition = {
  id: 'clipboard.write',
  name: 'Write Clipboard',
  category: 'device',
  riskLevel: 'medium',
  requiredPermissions: [],
  platform: 'android',
};

export class ClipboardReadCapability implements Capability {
  readonly definition = readDef;

  async execute(_params: Record<string, unknown>): Promise<ActionResult> {
    try {
      const text = await NativeBridge.readClipboard();
      return { success: true, data: { text } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Clipboard read failed' };
    }
  }

  async isAvailable(): Promise<boolean> { return true; }
}

export class ClipboardWriteCapability implements Capability {
  readonly definition = writeDef;

  async execute(params: Record<string, unknown>): Promise<ActionResult> {
    const text = params.text as string | undefined;
    if (text === undefined) {
      return { success: false, error: 'Missing text parameter.' };
    }
    try {
      await NativeBridge.writeClipboard(text);
      return { success: true, data: { written: true } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Clipboard write failed' };
    }
  }

  async isAvailable(): Promise<boolean> { return true; }
}
