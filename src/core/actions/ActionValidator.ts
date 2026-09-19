/**
 * Action Validator — validates ActionIntents before execution.
 * Checks capability exists, params are present, and platform is correct.
 */

import { ActionIntent, ValidationResult } from '../types/action';
import { CapabilityRegistry } from './CapabilityRegistry';
import { Platform } from 'react-native';

export class ActionValidator {
  constructor(private registry: CapabilityRegistry) {}

  /**
   * Validate an ActionIntent.
   * Returns { valid: true } or { valid: false, errors: [...] }.
   */
  validate(intent: ActionIntent): ValidationResult {
    const errors: string[] = [];

    // 1. Check intent has required fields
    if (!intent.id) {
      errors.push('ActionIntent must have an id.');
    }
    if (!intent.capability) {
      errors.push('ActionIntent must specify a capability.');
    }
    if (!intent.description) {
      errors.push('ActionIntent must have a description.');
    }

    // 2. Check capability is registered
    if (intent.capability && !this.registry.has(intent.capability)) {
      errors.push(`Capability "${intent.capability}" is not registered.`);
      // Can't check further if capability doesn't exist
      return { valid: false, errors };
    }

    // 3. Check platform compatibility
    if (intent.capability) {
      const capability = this.registry.get(intent.capability);
      if (capability) {
        const { platform } = capability.definition;
        if (platform !== 'any' && platform !== Platform.OS) {
          errors.push(
            `Capability "${intent.capability}" requires platform "${platform}" but current platform is "${Platform.OS}".`
          );
        }
      }
    }

    // 4. Basic risk/confirmation consistency
    if (intent.riskLevel === 'high' && !intent.requiresConfirmation) {
      errors.push('High-risk actions must require confirmation.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
