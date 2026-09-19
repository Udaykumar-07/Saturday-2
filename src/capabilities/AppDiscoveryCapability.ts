/**
 * App Discovery Capability — lists installed apps, resolves names to packages.
 * Risk: low — read-only query of installed apps.
 */

import { ActionResult, Capability, CapabilityDefinition } from '../core/types/action';
import { NativeBridge, InstalledApp } from '../native/NativeBridge';

const definition: CapabilityDefinition = {
  id: 'app.discover',
  name: 'Discover Apps',
  category: 'app',
  riskLevel: 'low',
  requiredPermissions: ['android.permission.QUERY_ALL_PACKAGES'],
  platform: 'android',
};

export class AppDiscoveryCapability implements Capability {
  readonly definition = definition;
  private cache: InstalledApp[] | null = null;

  async execute(params: Record<string, unknown>): Promise<ActionResult> {
    const query = params.query as string | undefined;
    try {
      const apps = await this.getApps();
      if (query) {
        const lower = query.toLowerCase();
        const matches = apps.filter(
          (a) =>
            a.name.toLowerCase().includes(lower) ||
            a.packageName.toLowerCase().includes(lower)
        );
        return { success: true, data: { apps: matches, total: matches.length } };
      }
      return { success: true, data: { apps, total: apps.length } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'App discovery failed' };
    }
  }

  /** Resolve a friendly name like "YouTube" to a package name. */
  async resolvePackage(appName: string): Promise<string | undefined> {
    const apps = await this.getApps();
    const lower = appName.toLowerCase();
    const match = apps.find((a) => a.name.toLowerCase() === lower);
    if (match) return match.packageName;
    const partial = apps.find((a) => a.name.toLowerCase().includes(lower));
    return partial?.packageName;
  }

  async isAvailable(): Promise<boolean> { return true; }

  private async getApps(): Promise<InstalledApp[]> {
    if (!this.cache) {
      this.cache = await NativeBridge.getInstalledApps();
    }
    return this.cache;
  }

  /** Clear the cached app list. */
  clearCache(): void { this.cache = null; }
}
