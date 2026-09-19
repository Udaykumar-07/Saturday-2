/**
 * Privacy Router for Saturday Intelligence System.
 *
 * Enforces hard privacy boundaries and scores provider privacy alignment.
 */

import { IntelligenceProviderEntry } from '../../core/types/intelligence';
import { TaskRequirements } from '../../core/types/external';

export class PrivacyRouter {
  /**
   * Check if a candidate provider satisfies hard privacy constraints.
   */
  isCompatible(
    provider: IntelligenceProviderEntry,
    requirements: TaskRequirements
  ): { compatible: boolean; reason?: string } {
    // 1. Hard constraint: localOnly flag
    if (requirements.localOnly) {
      if (provider.privacyProfile.sendsDataExternally || provider.privacyProfile.level !== 'local') {
        return {
          compatible: false,
          reason: `Task requires local execution (localOnly=true), but provider "${provider.name}" sends data externally`,
        };
      }
    }

    // 2. Hard constraint: task privacyLevel === 'local'
    if (requirements.privacyLevel === 'local') {
      if (provider.privacyProfile.level !== 'local' || provider.privacyProfile.sendsDataExternally) {
        return {
          compatible: false,
          reason: `Task privacy level is "local", but provider "${provider.name}" has level "${provider.privacyProfile.level}"`,
        };
      }
    }

    // 3. Privacy level 'private' (e.g. personal email or notes)
    if (requirements.privacyLevel === 'private') {
      if (provider.privacyProfile.dataRetentionPolicy === 'persistent') {
        return {
          compatible: false,
          reason: `Task involves private data, but provider "${provider.name}" retains data persistently`,
        };
      }
    }

    return { compatible: true };
  }

  /**
   * Score provider privacy characteristics from 0 to 1.
   * On-device/zero retention scores highest (1.0), public cloud scores lower.
   */
  calculatePrivacyScore(
    provider: IntelligenceProviderEntry,
    requirements: TaskRequirements
  ): number {
    const profile = provider.privacyProfile;

    if (profile.level === 'local' && !profile.sendsDataExternally) {
      return 1.0;
    }

    if (profile.level === 'private') {
      return profile.dataRetentionPolicy === 'none' ? 0.8 : 0.65;
    }

    // Standard cloud provider
    if (requirements.privacyLevel === 'standard') {
      return profile.dataRetentionPolicy === 'none' ? 0.7 : 0.5;
    }

    return 0.3;
  }
}
