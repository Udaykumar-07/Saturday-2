/**
 * Capabilities barrel — exports all capabilities and a registration helper.
 */

import { CapabilityRegistry } from '../core/actions/CapabilityRegistry';
import { DeviceInfoCapability } from './DeviceInfoCapability';
import { AppLaunchCapability } from './AppLaunchCapability';
import { UrlOpenCapability } from './UrlOpenCapability';
import { ClipboardReadCapability, ClipboardWriteCapability } from './ClipboardCapability';
import { HapticsCapability } from './HapticsCapability';
import { ShareCapability } from './ShareCapability';
import { AppDiscoveryCapability } from './AppDiscoveryCapability';
import { MediaPlayCapability } from './MediaPlayCapability';

export { DeviceInfoCapability } from './DeviceInfoCapability';
export { AppLaunchCapability } from './AppLaunchCapability';
export { UrlOpenCapability } from './UrlOpenCapability';
export { ClipboardReadCapability, ClipboardWriteCapability } from './ClipboardCapability';
export { HapticsCapability } from './HapticsCapability';
export { ShareCapability } from './ShareCapability';
export { AppDiscoveryCapability } from './AppDiscoveryCapability';
export { MediaPlayCapability } from './MediaPlayCapability';

/**
 * Register all built-in capabilities with a registry.
 */
export function registerAllCapabilities(registry: CapabilityRegistry): void {
  registry.register(new DeviceInfoCapability());
  registry.register(new AppLaunchCapability());
  registry.register(new UrlOpenCapability());
  registry.register(new ClipboardReadCapability());
  registry.register(new ClipboardWriteCapability());
  registry.register(new HapticsCapability());
  registry.register(new ShareCapability());
  registry.register(new AppDiscoveryCapability());
  registry.register(new MediaPlayCapability());
}
