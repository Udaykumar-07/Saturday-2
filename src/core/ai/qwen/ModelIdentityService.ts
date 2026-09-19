/**
 * Model Identity Service — deterministically identifies the active model and provider
 * running in Saturday's intelligence runtime.
 * Reflects live runtime state without hallucination.
 */

import { QwenModelRuntime } from './QwenModelRuntime';

export interface ModelIdentity {
  provider: string;
  modelId: string;
  displayName: string;
  executionType: 'LOCAL_MODEL' | 'CLOUD_MODEL' | 'FALLBACK';
  isLocal: boolean;
  status: string;
}

export class ModelIdentityService {
  constructor(private qwenRuntime?: QwenModelRuntime) {}

  /**
   * Check if user input is an inquiry about model identity.
   */
  isModelIdentityQuery(input: string): boolean {
    const lower = input.toLowerCase().trim();
    return (
      /^(?:which|what)\s+(?:ai\s+)?model\s+(?:are\s+you|is\s+this|runs\s+here|are\s+we\s+using)[\?!\.]*$/i.test(
        lower
      ) ||
      /^(?:what\s+ai|what\s+model)\s+(?:powers\s+you|is\s+running|do\s+you\s+use)[\?!\.]*$/i.test(
        lower
      ) ||
      lower === 'which model are you' ||
      lower === 'what model are you' ||
      lower === 'what model is this'
    );
  }

  /**
   * Get current model identity metadata.
   */
  getModelIdentity(): ModelIdentity {
    const qwenState = this.qwenRuntime?.getState();

    if (qwenState === 'READY') {
      return {
        provider: 'Qwen',
        modelId: this.qwenRuntime?.modelId || 'qwen2.5:0.5b',
        displayName: this.qwenRuntime?.displayName || 'Qwen 2.5 0.5B Instruct',
        executionType: 'LOCAL_MODEL',
        isLocal: true,
        status: 'READY',
      };
    }

    if (qwenState === 'LOADING') {
      return {
        provider: 'Qwen',
        modelId: this.qwenRuntime?.modelId || 'qwen2.5:0.5b',
        displayName: 'Qwen 2.5 0.5B Instruct',
        executionType: 'LOCAL_MODEL',
        isLocal: true,
        status: 'LOADING',
      };
    }

    return {
      provider: 'Local Fallback',
      modelId: 'fallback-embedded',
      displayName: 'Local Rule Engine',
      executionType: 'FALLBACK',
      isLocal: true,
      status: qwenState || 'UNINITIALIZED',
    };
  }

  /**
   * Generate an accurate conversational description of the running model.
   */
  getIdentityResponse(): string {
    const identity = this.getModelIdentity();

    if (identity.status === 'READY') {
      return `I'm running ${identity.displayName} (${identity.modelId}) locally on your device.`;
    }

    if (identity.status === 'LOADING') {
      return `I'm currently loading ${identity.displayName} for local on-device inference.`;
    }

    return `I'm currently using ${identity.displayName} because the primary local model is ${identity.status}.`;
  }
}
