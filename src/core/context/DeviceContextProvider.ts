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
    const now = new Date();
    
    // Format date/time in human-readable format for AI
    const dateStr = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
    
    return {
      currentTime: now.toISOString(), // Keep ISO for external providers
      deviceInfo: {
        platform: Platform.OS,
        version: Platform.Version,
        // Add formatted date/time for AI readability
        currentDate: dateStr,
        currentLocalTime: timeStr,
      },
    };
  }
}
