/**
 * Adapter that discovers built-in Saturday providers.
 */

import { IntelligenceSourceAdapter } from './IntelligenceSourceAdapter';
import { IntelligenceProviderEntry, BenchmarkRecord } from '../../core/types/intelligence';
import { CAPABILITIES } from '../registry/CapabilityTaxonomy';

export class BuiltInProviderAdapter implements IntelligenceSourceAdapter {
  readonly id = 'builtin_adapter';
  readonly name = 'Saturday Built-In Provider Adapter';
  lastFetched?: number;

  async fetchProviders(): Promise<IntelligenceProviderEntry[]> {
    this.lastFetched = Date.now();
    return [
      {
        id: 'local',
        name: 'On-Device AI Model',
        type: 'LOCAL_MODEL',
        capabilities: [
          { id: CAPABILITIES.TEXT_GENERATION, category: 'generation', score: 0.85 },
          { id: CAPABILITIES.REASONING, category: 'reasoning', score: 0.8 },
          { id: CAPABILITIES.SUMMARIZATION, category: 'generation', score: 0.8 },
          { id: CAPABILITIES.PRIVATE_DATA_PROCESSING, category: 'privacy', score: 1.0 },
        ],
        inputTypes: ['text'],
        outputTypes: ['text'],
        reasoningLevel: 'basic',
        contextWindow: 4096,
        visionSupport: false,
        codingSupport: true,
        researchSupport: false,
        agenticSupport: false,
        supportsStreaming: true,
        supportsStructuredOutput: true,
        supportsFunctionCalling: false,
        privacyProfile: {
          level: 'local',
          dataRetentionPolicy: 'none',
          sendsDataExternally: false,
          storageLocation: 'device',
        },
        costProfile: {
          costTier: 'free',
          inputCostPer1kTokens: 0,
          outputCostPer1kTokens: 0,
          currency: 'USD',
        },
        latencyProfile: {
          averageMs: 150,
          p50Ms: 120,
          p95Ms: 300,
          timeToFirstTokenMs: 80,
        },
        reliabilityProfile: {
          successRate: 0.99,
          failureRate: 0.01,
          sampleSize: 100,
        },
        state: 'ACTIVE',
        lastUpdated: this.lastFetched,
        source: 'builtin',
        version: '1.0.0',
      },
    ];
  }

  async fetchBenchmarks(): Promise<BenchmarkRecord[]> {
    return [];
  }
}
