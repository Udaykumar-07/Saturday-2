/**
 * Discovery Service for Intelligence Sources.
 *
 * Coordinates discovery adapters to locate, validate, and register
 * new or updated intelligence providers into the IntelligenceRegistry.
 */

import {
  IntelligenceProviderEntry,
  MetadataValidationResult,
} from '../../core/types/intelligence';
import { IntelligenceRegistry } from '../registry/IntelligenceRegistry';
import { IntelligenceSourceAdapter } from './IntelligenceSourceAdapter';

export class IntelligenceDiscoveryService {
  private adapters: Map<string, IntelligenceSourceAdapter> = new Map();

  constructor(private registry: IntelligenceRegistry) {}

  /**
   * Register a new discovery adapter.
   */
  registerAdapter(adapter: IntelligenceSourceAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  /**
   * Unregister an adapter by ID.
   */
  unregisterAdapter(adapterId: string): void {
    this.adapters.delete(adapterId);
  }

  /**
   * Run discovery across all adapters and update the registry.
   */
  async discoverProviders(): Promise<IntelligenceProviderEntry[]> {
    const discovered: IntelligenceProviderEntry[] = [];

    for (const adapter of this.adapters.values()) {
      try {
        const entries = await adapter.fetchProviders();
        for (const entry of entries) {
          const validation = this.validateProviderMetadata(entry);
          if (validation.valid) {
            this.registry.registerProvider(entry);
            discovered.push(entry);
          }
        }
      } catch {
        // Individual adapter failure does not abort other adapters
      }
    }

    return discovered;
  }

  /**
   * Validate provider metadata defensively to prevent malformed records
   * from corrupting the system.
   */
  validateProviderMetadata(entry: unknown): MetadataValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!entry || typeof entry !== 'object') {
      return { valid: false, errors: ['Entry must be a non-null object'], warnings: [] };
    }

    const p = entry as Partial<IntelligenceProviderEntry>;

    if (!p.id || typeof p.id !== 'string') {
      errors.push('Provider id is required and must be a string');
    }
    if (!p.name || typeof p.name !== 'string') {
      errors.push('Provider name is required and must be a string');
    }
    if (!p.type || typeof p.type !== 'string') {
      errors.push('Provider type is required');
    }
    if (!Array.isArray(p.capabilities)) {
      errors.push('Provider capabilities must be an array');
    } else if (p.capabilities.length === 0) {
      warnings.push('Provider declares zero capabilities');
    }

    if (!p.privacyProfile || typeof p.privacyProfile !== 'object') {
      errors.push('Provider must specify a privacyProfile');
    }
    if (!p.costProfile || typeof p.costProfile !== 'object') {
      errors.push('Provider must specify a costProfile');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Return all registered adapters.
   */
  getAdapters(): IntelligenceSourceAdapter[] {
    return Array.from(this.adapters.values());
  }
}
