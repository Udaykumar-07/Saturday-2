/**
 * Context provider that contributes basic device information.
 * Only provides safe, non-sensitive info in Phase 1.
 */

import { Platform } from 'react-native';
import { AIContext, ContextProvider } from '../types/context';

export class DeviceContextProvider implements ContextProvider {
  readonly id = 'device';
  readonly name = 'Device Context';

  async getContext(): Promise<Partial<AIContext>> {
    return {
      currentTime: new Date().toISOString(),
      deviceInfo: {
        platform: Platform.OS,
        version: Platform.Version,
      },
    };
  }
}
