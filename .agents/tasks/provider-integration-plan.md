# Implementation Plan: External AI Provider Integration

This plan implements support for OpenAI, Anthropic, and Google Gemini AI providers with real API integrations, inline configuration modals, enhanced routing intelligence, and comprehensive error handling.

## Implementation Order

The features are ordered by dependency:
1. **FEAT-001**: Provider adapters (foundation)
2. **FEAT-002**: Routing enhancements and modal UI (depends on FEAT-001)
3. **FEAT-003**: IntegrationsScreen UI and error handling (depends on FEAT-001 and FEAT-002)

---

## FEAT-001: External AI Provider Adapters

### What to Do
Create three external AI provider adapters (OpenAI, Anthropic, Google Gemini) with real API integrations, streaming support, API key validation, error mapping, and secure credential storage. Register providers in IntelligenceRegistry with capability metadata, benchmark scores, cost profiles, and latency profiles.

### Files to Create
- `c:\Users\uk\Pictures\Saturday-2\src\core\external\providers\ProviderTypes.ts`
- `c:\Users\uk\Pictures\Saturday-2\src\core\external\providers\OpenAIProvider.ts`
- `c:\Users\uk\Pictures\Saturday-2\src\core\external\providers\AnthropicProvider.ts`
- `c:\Users\uk\Pictures\Saturday-2\src\core\external\providers\GoogleGeminiProvider.ts`

### Files to Modify
- `c:\Users\uk\Pictures\Saturday-2\src\core\external\providers\index.ts`
- `c:\Users\uk\Pictures\Saturday-2\src\intelligence\registry\IntelligenceRegistry.ts`
- `c:\Users\uk\Pictures\Saturday-2\src\services\container.ts`

### Detailed Steps

#### 1. Create ProviderTypes.ts

Define shared interfaces:

```typescript
export interface AIProviderAdapter {
  generateStream(input: string, model: string): AsyncGenerator<StreamChunk>;
  validateApiKey(key: string): Promise<boolean>;
  getCost(inputTokens: number, outputTokens: number): number;
  getLatency(): number;
}

export interface StreamChunk {
  text: string;
  done: boolean;
}

export interface ProviderError {
  code: 'INVALID_KEY' | 'RATE_LIMIT' | 'NETWORK_ERROR' | 'TIMEOUT' | 'UNKNOWN';
  message: string;
  retryable: boolean;
}

export interface ProviderConfig {
  apiKey: string;
  model: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}
```

#### 2. Create OpenAIProvider.ts

```typescript
import { BaseExternalProvider } from './ExternalProvider';
import { CredentialStore } from '../../external/authentication/CredentialStore';
import { ExternalRequest, ExternalResponse } from '../../../types/external';

export class OpenAIProvider extends BaseExternalProvider {
  readonly id = 'openai_provider';
  readonly name = 'OpenAI';
  readonly type = 'cloud_model' as const;

  constructor(private credentialStore: CredentialStore) {
    super();
  }

  async isAvailable(): Promise<boolean> {
    return this.credentialStore.has(this.id);
  }

  getCapabilities(): string[] {
    return [
      'TEXT_GENERATION',
      'REASONING',
      'DEEP_REASONING',
      'CODING',
      'VISION',
      'FUNCTION_CALLING',
      'STRUCTURED_OUTPUT',
    ];
  }

  async validateApiKey(key: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async execute(request: ExternalRequest): Promise<ExternalResponse> {
    const config = await this.credentialStore.retrieve<{ apiKey: string }>(this.id);
    if (!config) {
      return {
        taskId: request.taskId,
        status: 'requires_authentication',
        providerId: this.id,
        metadata: { serviceId: this.id },
      };
    }

    const model = 'gpt-4o'; // Default model
    const controller = new AbortController();
    
    try {
      const startTime = Date.now();
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: request.objective }],
          stream: false,
        }),
        signal: controller.signal,
      });

      if (response.status === 429) {
        throw new Error('RATE_LIMIT');
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error('INVALID_KEY');
      }
      if (!response.ok) {
        throw new Error('API_ERROR');
      }

      const data = await response.json();
      const latency = Date.now() - startTime;
      this.recordSuccess(latency);

      return {
        taskId: request.taskId,
        status: 'completed',
        providerId: this.id,
        result: data.choices[0]?.message?.content || '',
      };
    } catch (error) {
      this.recordFailure();
      return {
        taskId: request.taskId,
        status: 'failed',
        providerId: this.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async *generateStream(input: string, model: string): AsyncGenerator<{ text: string; done: boolean }> {
    const config = await this.credentialStore.retrieve<{ apiKey: string }>(this.id);
    if (!config) {
      throw new Error('No API key configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: input }],
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error('Stream request failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          yield { text: '', done: true };
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
        
        for (const line of lines) {
          const data = line.replace('data: ', '').trim();
          if (data === '[DONE]') {
            yield { text: '', done: true };
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            if (content) {
              yield { text: content, done: false };
            }
          } catch {
            // Skip invalid JSON chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
```

#### 3. Create AnthropicProvider.ts

Similar structure to OpenAIProvider, but:
- API endpoint: `https://api.anthropic.com/v1/messages`
- Header: `x-api-key` instead of `Authorization: Bearer`
- Models: `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`
- Request body format per Anthropic's API spec
- Capabilities: `['TEXT_GENERATION', 'REASONING', 'DEEP_REASONING', 'CODING', 'VISION', 'LONG_CONTEXT']`

#### 4. Create GoogleGeminiProvider.ts

Similar structure, but:
- API endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?key={apiKey}`
- Models: `gemini-1.5-pro`, `gemini-1.5-flash`
- API key passed as query parameter
- Request body format per Google's Gemini API spec
- Capabilities: `['TEXT_GENERATION', 'REASONING', 'CODING', 'VISION', 'LONG_CONTEXT']`

#### 5. Update index.ts

```typescript
export * from './ExternalProvider';
export * from './ExternalProviderRegistry';
export { OpenAIProvider } from './OpenAIProvider';
export { AnthropicProvider } from './AnthropicProvider';
export { GoogleGeminiProvider } from './GoogleGeminiProvider';
export type { AIProviderAdapter, StreamChunk, ProviderError, ProviderConfig, TokenUsage } from './ProviderTypes';
```

#### 6. Extend IntelligenceRegistry.ts

Add methods:

```typescript
/**
 * Register an external provider with capability metadata.
 */
registerExternalProvider(config: {
  id: string;
  name: string;
  type: 'CLOUD_MODEL';
  capabilities: ProviderCapability[];
  costProfile: CostProfile;
  latencyProfile: LatencyProfile;
  benchmarkScores: Record<string, number>;
}): void {
  const entry: IntelligenceProviderEntry = {
    id: config.id,
    name: config.name,
    type: config.type,
    capabilities: config.capabilities,
    inputTypes: ['text'],
    outputTypes: ['text'],
    reasoningLevel: 'deep',
    contextWindow: 128000,
    visionSupport: true,
    codingSupport: true,
    researchSupport: false,
    agenticSupport: false,
    supportsStreaming: true,
    supportsStructuredOutput: true,
    supportsFunctionCalling: true,
    privacyProfile: {
      level: 'standard',
      dataRetentionPolicy: 'none',
      sendsDataExternally: true,
      storageLocation: 'cloud',
    },
    costProfile: config.costProfile,
    latencyProfile: config.latencyProfile,
    reliabilityProfile: {
      successRate: 0.95,
      failureRate: 0.05,
      sampleSize: 100,
    },
    state: 'INACTIVE', // Activated when API key is present
    lastUpdated: Date.now(),
    source: 'external',
    version: '1.0.0',
  };
  this.registerProvider(entry);
}

/**
 * Get providers matching specific requirements.
 */
getProvidersByRequirement(requirements: TaskRequirements): IntelligenceProviderEntry[] {
  const active = this.getActiveProviders();
  const reqCaps = requirements.capabilities || [];
  
  return active.filter((provider) => {
    // Check reasoning level
    const reasoningLevels = ['none', 'basic', 'advanced', 'deep'];
    const reqLevel = reasoningLevels.indexOf(requirements.reasoningLevel);
    const provLevel = reasoningLevels.indexOf(provider.reasoningLevel);
    if (provLevel < reqLevel) return false;
    
    // Check capabilities
    const provCaps = provider.capabilities.map((c) => c.id);
    const hasAllRequired = reqCaps.every((rc) => provCaps.includes(rc));
    if (!hasAllRequired) return false;
    
    return true;
  });
}
```

In `registerBuiltInProviders()`, add after existing registrations:

```typescript
// Register external AI providers (inactive until API keys are configured)
this.registerExternalProvider({
  id: 'openai_provider',
  name: 'OpenAI GPT-4o',
  type: 'CLOUD_MODEL',
  capabilities: [
    { id: 'TEXT_GENERATION', category: 'generation', score: 0.95 },
    { id: 'REASONING', category: 'reasoning', score: 0.92 },
    { id: 'DEEP_REASONING', category: 'reasoning', score: 0.90 },
    { id: 'CODING', category: 'coding', score: 0.93 },
    { id: 'VISION', category: 'media', score: 0.88 },
  ],
  costProfile: {
    costTier: 'medium',
    inputCostPer1kTokens: 0.0025,
    outputCostPer1kTokens: 0.01,
    currency: 'USD',
  },
  latencyProfile: {
    averageMs: 1200,
    p50Ms: 1000,
    p95Ms: 2500,
  },
  benchmarkScores: {
    MMLU: 88.7,
    HumanEval: 90.2,
  },
});

// Similar for anthropic_provider and google_gemini_provider
```

#### 7. Update container.ts

Add fields:

```typescript
readonly openAIProvider: OpenAIProvider;
readonly anthropicProvider: AnthropicProvider;
readonly googleGeminiProvider: GoogleGeminiProvider;
```

In constructor, after `externalRegistry` instantiation:

```typescript
this.openAIProvider = new OpenAIProvider(this.credentialStore);
this.anthropicProvider = new AnthropicProvider(this.credentialStore);
this.googleGeminiProvider = new GoogleGeminiProvider(this.credentialStore);

this.externalRegistry.register(this.openAIProvider);
this.externalRegistry.register(this.anthropicProvider);
this.externalRegistry.register(this.googleGeminiProvider);
```

### Verification
Run `npm run typecheck` and verify no errors. Manually inspect all created files for correct API endpoints and interface implementations.

---

## FEAT-002: Routing Enhancements and Provider Request Modal

### What to Do
Enhance Laya intent classification with provider routing metadata. Create ProviderMetadataStore and BenchmarkData. Extend RoutingDecisionEngine with provider availability checks. Create ProviderRequestModal component. Wire ConversationService to handle unconfigured provider flows.

### Files to Create
- `c:\Users\uk\Pictures\Saturday-2\src\intelligence\metadata\BenchmarkData.ts`
- `c:\Users\uk\Pictures\Saturday-2\src\intelligence\metadata\ProviderMetadataStore.ts`
- `c:\Users\uk\Pictures\Saturday-2\src\intelligence\metadata\index.ts`
- `c:\Users\uk\Pictures\Saturday-2\src\ui\components\ProviderRequestModal.tsx`

### Files to Modify
- `c:\Users\uk\Pictures\Saturday-2\src\core\ai\laya\LayaIntentClassifier.ts`
- `c:\Users\uk\Pictures\Saturday-2\src\core\types\intelligence.ts`
- `c:\Users\uk\Pictures\Saturday-2\src\intelligence\routing\RoutingDecisionEngine.ts`
- `c:\Users\uk\Pictures\Saturday-2\src\services\ConversationService.ts`
- `c:\Users\uk\Pictures\Saturday-2\src\ui\screens\HomeScreen.tsx`
- `c:\Users\uk\Pictures\Saturday-2\src\services\container.ts`

### Detailed Steps

#### 1. Extend LayaIntentClassifier.ts

Add to `LayaClassificationResult` interface:

```typescript
export interface LayaClassificationResult extends TaskIntent {
  classifiedBy: 'laya' | 'keyword_fallback';
  urgencyScore?: number;
  isPersonalFact?: boolean;
  distribution?: Record<string, number>;
  latencyMs?: number;
  
  // New fields
  suggestedProviders: string[];
  requiresExternalCapabilities: boolean;
  reasoningComplexity: 'basic' | 'moderate' | 'deep';
  estimatedTokens: number;
}
```

In `classify()` method, after determining `finalType`:

```typescript
// Determine if external capabilities are required
let suggestedProviders: string[] = [];
let requiresExternalCapabilities = false;
let reasoningComplexity: 'basic' | 'moderate' | 'deep' = 'basic';

if (['REASONING', 'AGENT_TASK', 'MULTI_STEP_TASK'].includes(finalType)) {
  requiresExternalCapabilities = true;
  suggestedProviders = ['openai_provider', 'anthropic_provider', 'google_gemini_provider'];
}

if (finalType === 'REASONING') {
  reasoningComplexity = 'moderate';
} else if (['AGENT_TASK', 'MULTI_STEP_TASK'].includes(finalType)) {
  reasoningComplexity = 'deep';
}

const estimatedTokens = Math.ceil(input.length / 4) * 2; // Rough estimate

const result: LayaClassificationResult = {
  type: finalType,
  confidence: taskTypeAnswer.confidence,
  originalInput: input,
  classifiedBy: 'laya',
  isPersonalFact: personalFactAnswer ? personalFactAnswer.noul > 0.5 : false,
  urgencyScore: urgencyAnswer?.score,
  distribution: taskTypeAnswer.probabilities,
  latencyMs,
  suggestedProviders,
  requiresExternalCapabilities,
  reasoningComplexity,
  estimatedTokens,
};
```

#### 2. Create BenchmarkData.ts

```typescript
export interface BenchmarkScore {
  name: string;
  score: number;
  metric: string;
}

export const KNOWN_BENCHMARKS: Record<string, BenchmarkScore[]> = {
  openai_provider: [
    { name: 'MMLU', score: 88.7, metric: 'accuracy' },
    { name: 'HumanEval', score: 90.2, metric: 'pass@1' },
  ],
  anthropic_provider: [
    { name: 'MMLU', score: 88.3, metric: 'accuracy' },
    { name: 'HumanEval', score: 92.0, metric: 'pass@1' },
  ],
  google_gemini_provider: [
    { name: 'MMLU', score: 85.9, metric: 'accuracy' },
    { name: 'HumanEval', score: 84.1, metric: 'pass@1' },
  ],
  local: [
    { name: 'MMLU', score: 45.0, metric: 'accuracy' },
    { name: 'HumanEval', score: 38.0, metric: 'pass@1' },
  ],
};
```

#### 3. Create ProviderMetadataStore.ts

```typescript
import { KNOWN_BENCHMARKS, BenchmarkScore } from './BenchmarkData';

export class ProviderMetadataStore {
  private cache: Map<string, any> = new Map();

  constructor(private benchmarkData: typeof KNOWN_BENCHMARKS) {}

  getCapabilities(providerId: string): string[] {
    // Return from cache or registry
    return [];
  }

  getBenchmarks(providerId: string): BenchmarkScore[] {
    return this.benchmarkData[providerId] || [];
  }

  getCostEstimate(providerId: string, estimatedTokens: number): number {
    const costs: Record<string, { input: number; output: number }> = {
      openai_provider: { input: 0.0025, output: 0.01 },
      anthropic_provider: { input: 0.003, output: 0.015 },
      google_gemini_provider: { input: 0.00125, output: 0.005 },
    };
    const cost = costs[providerId];
    if (!cost) return 0;
    return ((estimatedTokens * cost.input) + (estimatedTokens * cost.output)) / 1000;
  }

  getLatency(providerId: string): number {
    const latencies: Record<string, number> = {
      openai_provider: 1200,
      anthropic_provider: 1400,
      google_gemini_provider: 1300,
      local: 150,
    };
    return latencies[providerId] || 1000;
  }

  async refresh(): Promise<void> {
    // Future: fetch fresh benchmark data
  }
}
```

#### 4. Create metadata/index.ts

```typescript
export { ProviderMetadataStore } from './ProviderMetadataStore';
export { KNOWN_BENCHMARKS, BenchmarkScore } from './BenchmarkData';
export type { BenchmarkScore } from './BenchmarkData';
```

#### 5. Extend intelligence.ts types

In `RoutingDecision` interface, add:

```typescript
export interface RoutingDecision {
  selectedProvider: string;
  executionTarget: ExecutionTarget;
  requiredCapabilities: string[];
  rejectedCandidates: RejectedCandidate[];
  decisionFactors: Record<string, number>;
  fallbackProvider?: string;
  confidence: number;
  dataFreshness: DataFreshness;
  requiresConfirmation: boolean;
  requiresAuthentication: boolean;
  explanation: string;
  
  // New fields
  requiresConfiguration?: boolean;
  unconfiguredProviderId?: string;
}
```

#### 6. Extend RoutingDecisionEngine.ts

Add `credentialStore` parameter to constructor:

```typescript
constructor(
  private registry: IntelligenceRegistry,
  private hardConstraintFilter: HardConstraintFilter,
  private evaluationService: ProviderEvaluationService,
  private benchmarkStore: BenchmarkStore,
  private credentialStore: CredentialStore // NEW
) {}
```

Add method:

```typescript
private async checkProviderAvailability(providerId: string): Promise<boolean> {
  if (['openai_provider', 'anthropic_provider', 'google_gemini_provider'].includes(providerId)) {
    return this.credentialStore.has(providerId);
  }
  return true;
}
```

In `decide()` method, before returning the decision:

```typescript
// Check if selected provider requires configuration
if (['openai_provider', 'anthropic_provider', 'google_gemini_provider'].includes(topProvider.id)) {
  const available = await this.checkProviderAvailability(topProvider.id);
  if (!available) {
    return {
      ...decision,
      requiresConfiguration: true,
      unconfiguredProviderId: topProvider.id,
      explanation: `${topProvider.name} requires configuration before use.`,
    };
  }
}
```

Add cost estimation method:

```typescript
estimateCost(requirements: TaskRequirements, providerId: string): number {
  const provider = this.registry.getProvider(providerId);
  if (!provider || !provider.costProfile.inputCostPer1kTokens) return 0;
  
  const estimatedTokens = 1000; // Default estimate
  const inputCost = (estimatedTokens * provider.costProfile.inputCostPer1kTokens!) / 1000;
  const outputCost = (estimatedTokens * (provider.costProfile.outputCostPer1kTokens || 0)) / 1000;
  return inputCost + outputCost;
}
```

#### 7. Create ProviderRequestModal.tsx

```typescript
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export interface ProviderRequestModalProps {
  visible: boolean;
  providerName: string;
  providerReason: string;
  estimatedCost: string;
  onConfigure: () => void;
  onFallbackLocal: () => void;
  onCancel: () => void;
}

export const ProviderRequestModal: React.FC<ProviderRequestModalProps> = ({
  visible,
  providerName,
  providerReason,
  estimatedCost,
  onConfigure,
  onFallbackLocal,
  onCancel,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>External Provider Required</Text>
          <Text style={styles.message}>
            {providerName} is recommended for this task: {providerReason}
          </Text>
          <Text style={styles.cost}>Estimated cost: {estimatedCost}</Text>
          <Text style={styles.warning}>
            ⚠️ Using external providers sends your data to third-party services.
            Your API key and data are handled securely per provider policies.
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={onConfigure}>
            <Text style={styles.primaryButtonText}>Configure {providerName}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onFallbackLocal}>
            <Text style={styles.secondaryButtonText}>Use Local AI Instead</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  cost: {
    fontSize: 13,
    color: colors.textTertiary,
    marginBottom: 12,
  },
  warning: {
    fontSize: 12,
    color: colors.warning,
    lineHeight: 18,
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: colors.buttonPrimaryText,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textTertiary,
    fontSize: 14,
  },
});
```

#### 8. Extend ConversationService.ts

Add field:

```typescript
private providerConfigCallback: ((decision: RoutingDecision) => Promise<void>) | null = null;
```

Add method:

```typescript
setProviderConfigCallback(cb: (decision: RoutingDecision) => Promise<void>): void {
  this.providerConfigCallback = cb;
}
```

In `sendMessage()`, after obtaining routing decision (note: current code may need refactoring to pass requirements to router):

```typescript
const routingDecision = await this.router.route(); // TODO: Pass requirements

if (routingDecision.requiresConfiguration && this.providerConfigCallback) {
  // Notify user that configuration is needed
  const assistantMessage: Message = {
    id: this.generateMessageId(),
    role: 'assistant',
    content: `I'd like to use ${routingDecision.unconfiguredProviderId} for this task, but it needs configuration first. Please set it up in Settings > External AI Providers.`,
    timestamp: Date.now(),
    metadata: {
      providerId: 'routing-engine',
      requiresConfig: true,
      unconfiguredProviderId: routingDecision.unconfiguredProviderId,
    },
  };
  
  conversation = await this.repository.appendMessage(conversationId, assistantMessage);
  return { userMessage, assistantMessage };
}
```

Add provider attribution after response generation:

```typescript
if (['openai_provider', 'anthropic_provider', 'google_gemini_provider'].includes(providerId)) {
  assistantContent += `\n\n_Powered by ${response.metadata?.providerDisplayName || providerId}_`;
}
```

#### 9. Extend HomeScreen.tsx

Add imports and state:

```typescript
import { ProviderRequestModal } from '../components/ProviderRequestModal';

const [providerModalVisible, setProviderModalVisible] = useState(false);
const [providerModalData, setProviderModalData] = useState<{
  providerName: string;
  reason: string;
  cost: string;
} | null>(null);
```

Add modal component before closing `KeyboardAvoidingView`:

```typescript
<ProviderRequestModal
  visible={providerModalVisible}
  providerName={providerModalData?.providerName || ''}
  providerReason={providerModalData?.reason || ''}
  estimatedCost={providerModalData?.cost || '~$0.01'}
  onConfigure={() => {
    setProviderModalVisible(false);
    setIsIntegrationsOpen(true);
  }}
  onFallbackLocal={() => {
    setProviderModalVisible(false);
    // TODO: Trigger local fallback
  }}
  onCancel={() => setProviderModalVisible(false)}
/>
```

#### 10. Update container.ts

Pass `credentialStore` to `RoutingDecisionEngine`:

```typescript
this.decisionEngine = new RoutingDecisionEngine(
  this.intelligenceRegistry,
  this.hardConstraintFilter,
  this.providerEvaluation,
  this.benchmarkStore,
  this.credentialStore // NEW
);
```

Add `ProviderMetadataStore`:

```typescript
import { KNOWN_BENCHMARKS } from '../intelligence/metadata';

// In constructor
this.providerMetadata = new ProviderMetadataStore(KNOWN_BENCHMARKS);

// Add field
readonly providerMetadata: ProviderMetadataStore;
```

### Verification
Run `npm run typecheck` and verify no errors. Manually inspect all modified files.

---

## FEAT-003: IntegrationsScreen Extensions and Error Handling

### What to Do
Extend IntegrationsScreen with External AI Providers section. Create useExternalProviders hook. Add provider-specific error handling to ConversationService. Create EXTERNAL_PROVIDERS.md documentation.

### Files to Create
- `c:\Users\uk\Pictures\Saturday-2\src\hooks\useExternalProviders.tsx`
- `c:\Users\uk\Pictures\Saturday-2\EXTERNAL_PROVIDERS.md`

### Files to Modify
- `c:\Users\uk\Pictures\Saturday-2\src\ui\screens\IntegrationsScreen.tsx`
- `c:\Users\uk\Pictures\Saturday-2\src\core\types\errors.ts`
- `c:\Users\uk\Pictures\Saturday-2\src\services\ConversationService.ts`
- `c:\Users\uk\Pictures\Saturday-2\src\core\external\providers\OpenAIProvider.ts`
- `c:\Users\uk\Pictures\Saturday-2\src\core\external\providers\AnthropicProvider.ts`
- `c:\Users\uk\Pictures\Saturday-2\src\core\external\providers\GoogleGeminiProvider.ts`

### Detailed Steps

#### 1. Create useExternalProviders.tsx

```typescript
import { useState, useEffect } from 'react';
import { getServices } from '../services/container';

export interface ExternalProviderStatus {
  id: string;
  name: string;
  connected: boolean;
  valid: boolean;
  models: string[];
}

export function useExternalProviders() {
  const [providers, setProviders] = useState<ExternalProviderStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const services = getServices();
  const credentialStore = services.credentialStore;
  const externalRegistry = services.externalRegistry;

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    const openai = externalRegistry.get('openai_provider');
    const anthropic = externalRegistry.get('anthropic_provider');
    const gemini = externalRegistry.get('google_gemini_provider');

    const statuses: ExternalProviderStatus[] = [
      {
        id: 'openai_provider',
        name: 'OpenAI',
        connected: await credentialStore.has('openai_provider'),
        valid: false,
        models: ['gpt-4', 'gpt-4o', 'o1-preview'],
      },
      {
        id: 'anthropic_provider',
        name: 'Anthropic Claude',
        connected: await credentialStore.has('anthropic_provider'),
        valid: false,
        models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
      },
      {
        id: 'google_gemini_provider',
        name: 'Google Gemini',
        connected: await credentialStore.has('google_gemini_provider'),
        valid: false,
        models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
      },
    ];

    setProviders(statuses);
  }

  async function connectProvider(id: string, apiKey: string): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      const provider = externalRegistry.get(id) as any;
      if (!provider || !provider.validateApiKey) {
        throw new Error('Provider not found');
      }

      const valid = await provider.validateApiKey(apiKey);
      if (!valid) {
        setError('Invalid API key');
        return false;
      }

      await credentialStore.store(id, { apiKey });
      await loadProviders();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function disconnectProvider(id: string): Promise<void> {
    setLoading(true);
    try {
      await credentialStore.remove(id);
      await loadProviders();
    } finally {
      setLoading(false);
    }
  }

  async function testConnection(id: string): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      const config = await credentialStore.retrieve<{ apiKey: string }>(id);
      if (!config) {
        setError('No API key configured');
        return false;
      }

      const provider = externalRegistry.get(id) as any;
      if (!provider || !provider.validateApiKey) {
        throw new Error('Provider not found');
      }

      const valid = await provider.validateApiKey(config.apiKey);
      if (!valid) {
        setError('Connection test failed');
        return false;
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
      return false;
    } finally {
      setLoading(false);
    }
  }

  return {
    providers,
    connectProvider,
    disconnectProvider,
    testConnection,
    loading,
    error,
  };
}
```

#### 2. Extend IntegrationsScreen.tsx

After existing imports, add:

```typescript
import { useExternalProviders } from '../../hooks/useExternalProviders';
```

After existing hooks, add:

```typescript
const {
  providers: externalProviders,
  connectProvider,
  disconnectProvider,
  testConnection,
  loading: externalLoading,
  error: externalError,
} = useExternalProviders();

const [configModalVisible, setConfigModalVisible] = useState<string | null>(null);
const [apiKeyInput, setApiKeyInput] = useState('');
const [testResult, setTestResult] = useState<string | null>(null);
```

After Connected Services section, add:

```typescript
{/* Section: External AI Providers */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>External AI Providers</Text>
  <Text style={styles.sectionSubtitle}>
    Connect AI providers for advanced reasoning and multi-step tasks.
  </Text>

  {externalProviders.map((provider) => (
    <View key={provider.id} style={styles.providerCard}>
      <View style={styles.providerHeader}>
        <Text style={styles.providerName}>{provider.name}</Text>
        <View
          style={[
            styles.statusBadge,
            provider.connected ? styles.statusConnected : styles.statusDisconnected,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              provider.connected ? styles.statusTextConnected : styles.statusTextDisconnected,
            ]}
          >
            {provider.connected ? 'Connected' : 'Not Connected'}
          </Text>
        </View>
      </View>

      <Text style={styles.providerModels}>
        Models: {provider.models.join(', ')}
      </Text>

      {provider.connected ? (
        <View style={styles.providerActions}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={async () => {
              const result = await testConnection(provider.id);
              setTestResult(result ? 'Connection successful!' : 'Connection failed');
              setTimeout(() => setTestResult(null), 3000);
            }}
          >
            <Text style={styles.testButtonText}>Test Connection</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={() => disconnectProvider(provider.id)}
          >
            <Text style={styles.disconnectButtonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.connectButton}
          onPress={() => {
            setConfigModalVisible(provider.id);
            setApiKeyInput('');
          }}
        >
          <Text style={styles.connectButtonText}>Connect</Text>
        </TouchableOpacity>
      )}

      {testResult && <Text style={styles.testResult}>{testResult}</Text>}
    </View>
  ))}
</View>

{/* Config Modal for each provider */}
{externalProviders.map((provider) => (
  <Modal
    key={`modal-${provider.id}`}
    visible={configModalVisible === provider.id}
    animationType="slide"
    presentationStyle="pageSheet"
  >
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Configure {provider.name}</Text>
        <TouchableOpacity
          onPress={() => setConfigModalVisible(null)}
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
        <Text style={styles.modalLabel}>API Key</Text>
        <TextInput
          style={styles.modalInput}
          value={apiKeyInput}
          onChangeText={setApiKeyInput}
          placeholder="Paste your API key here"
          placeholderTextColor={colors.textPlaceholder}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.modalHint}>
          Get your API key from:{' '}
          <Text style={styles.modalLink}>
            {provider.id === 'openai_provider' && 'https://platform.openai.com/api-keys'}
            {provider.id === 'anthropic_provider' && 'https://console.anthropic.com/settings/keys'}
            {provider.id === 'google_gemini_provider' && 'https://aistudio.google.com/app/apikey'}
          </Text>
        </Text>

        <Text style={styles.modalWarning}>
          ⚠️ Your API key is stored securely on your device using Android Keystore.
          Data sent to {provider.name} is subject to their privacy policy.
        </Text>

        <TouchableOpacity
          style={styles.modalSaveButton}
          disabled={!apiKeyInput || externalLoading}
          onPress={async () => {
            const success = await connectProvider(provider.id, apiKeyInput);
            if (success) {
              setConfigModalVisible(null);
            }
          }}
        >
          <Text style={styles.modalSaveButtonText}>
            {externalLoading ? 'Connecting...' : 'Save & Connect'}
          </Text>
        </TouchableOpacity>

        {externalError && (
          <Text style={styles.modalError}>{externalError}</Text>
        )}
      </ScrollView>
    </View>
  </Modal>
))}
```

Add styles:

```typescript
providerCard: {
  backgroundColor: colors.surface,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colors.surfaceBorder,
  padding: 16,
  marginBottom: 12,
},
providerHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
providerName: {
  fontSize: 15,
  fontWeight: '600',
  color: colors.textPrimary,
},
statusBadge: {
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
},
statusConnected: {
  backgroundColor: colors.successBackground,
  borderWidth: 1,
  borderColor: colors.successBorder,
},
statusDisconnected: {
  backgroundColor: colors.errorBackground,
  borderWidth: 1,
  borderColor: colors.errorBorder,
},
statusText: {
  fontSize: 11,
  fontWeight: '600',
},
statusTextConnected: {
  color: colors.success,
},
statusTextDisconnected: {
  color: colors.error,
},
providerModels: {
  fontSize: 12,
  color: colors.textTertiary,
  marginBottom: 12,
},
providerActions: {
  flexDirection: 'row',
  gap: 10,
},
testButton: {
  flex: 1,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.accent,
  paddingVertical: 10,
  borderRadius: 10,
  alignItems: 'center',
},
testButtonText: {
  color: colors.accent,
  fontSize: 13,
  fontWeight: '600',
},
disconnectButton: {
  flex: 1,
  backgroundColor: colors.errorBackground,
  borderWidth: 1,
  borderColor: colors.errorBorder,
  paddingVertical: 10,
  borderRadius: 10,
  alignItems: 'center',
},
disconnectButtonText: {
  color: colors.error,
  fontSize: 13,
  fontWeight: '600',
},
connectButton: {
  backgroundColor: colors.primary,
  paddingVertical: 12,
  borderRadius: 10,
  alignItems: 'center',
},
connectButtonText: {
  color: colors.buttonPrimaryText,
  fontSize: 14,
  fontWeight: '600',
},
testResult: {
  marginTop: 8,
  fontSize: 12,
  color: colors.success,
},
modalContainer: {
  flex: 1,
  backgroundColor: colors.background,
},
modalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingTop: 24,
  paddingBottom: 16,
  borderBottomWidth: 1,
  borderBottomColor: colors.surfaceBorder,
},
modalTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: colors.textPrimary,
},
modalScroll: {
  flex: 1,
},
modalContent: {
  padding: 20,
},
modalLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: colors.textPrimary,
  marginBottom: 8,
},
modalInput: {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.surfaceBorder,
  borderRadius: 10,
  paddingHorizontal: 16,
  paddingVertical: 12,
  fontSize: 14,
  color: colors.textPrimary,
  marginBottom: 12,
},
modalHint: {
  fontSize: 12,
  color: colors.textSecondary,
  marginBottom: 16,
  lineHeight: 18,
},
modalLink: {
  color: colors.accent,
  textDecorationLine: 'underline',
},
modalWarning: {
  fontSize: 12,
  color: colors.warning,
  backgroundColor: 'rgba(245, 158, 11, 0.1)',
  padding: 12,
  borderRadius: 8,
  marginBottom: 20,
  lineHeight: 18,
},
modalSaveButton: {
  backgroundColor: colors.primary,
  paddingVertical: 14,
  borderRadius: 12,
  alignItems: 'center',
},
modalSaveButtonText: {
  color: colors.buttonPrimaryText,
  fontSize: 15,
  fontWeight: '600',
},
modalError: {
  marginTop: 12,
  fontSize: 13,
  color: colors.error,
  textAlign: 'center',
},
```

#### 3. Extend errors.ts

Add new error classes:

```typescript
export class ProviderRateLimitError extends ExternalProviderError {
  constructor(providerId: string) {
    super(`Rate limit exceeded for ${providerId}`, providerId, true);
    this.name = 'ProviderRateLimitError';
  }
}

export class ProviderInvalidKeyError extends ExternalProviderError {
  constructor(providerId: string) {
    super(`Invalid API key for ${providerId}`, providerId, true);
    this.name = 'ProviderInvalidKeyError';
  }
}

export class ProviderNetworkError extends ExternalProviderError {
  constructor(providerId: string) {
    super(`Network error connecting to ${providerId}`, providerId, true);
    this.name = 'ProviderNetworkError';
  }
}
```

#### 4. Extend ConversationService.ts error handling

In `sendMessage()` catch block, before the generic error handling:

```typescript
import {
  ProviderRateLimitError,
  ProviderInvalidKeyError,
  ProviderNetworkError,
} from '../core/types/errors';

// In catch block
if (error instanceof ProviderRateLimitError) {
  assistantContent = `Rate limit reached for ${error.providerId}. Please wait a moment and try again, or use local AI.`;
} else if (error instanceof ProviderInvalidKeyError) {
  assistantContent = `API key for ${error.providerId} is invalid. Please reconfigure it in Settings > External AI Providers.`;
} else if (error instanceof ProviderNetworkError) {
  assistantContent = `Network error connecting to ${error.providerId}. Check your connection or use local AI.`;
}
```

Add automatic fallback logic around provider.generate():

```typescript
let response: AIResponse;
try {
  response = await provider.generate(request);
} catch (providerError) {
  if (providerError instanceof ExternalProviderError) {
    console.warn(`External provider failed, falling back to local: ${providerError.message}`);
    const localProvider = this.registry.getProvider('local');
    if (localProvider) {
      providerId = 'local';
      response = await localProvider.generate(request);
    } else {
      throw providerError;
    }
  } else {
    throw providerError;
  }
}
```

#### 5. Update provider error throwing

In OpenAIProvider.ts, AnthropicProvider.ts, GoogleGeminiProvider.ts `execute()` methods:

```typescript
import {
  ProviderRateLimitError,
  ProviderInvalidKeyError,
  ProviderNetworkError,
} from '../../../types/errors';

// In execute() fetch handling
if (response.status === 429) {
  throw new ProviderRateLimitError(this.id);
}
if (response.status === 401 || response.status === 403) {
  throw new ProviderInvalidKeyError(this.id);
}
if (!response.ok) {
  throw new Error(`API error: ${response.status}`);
}

// Wrap fetch in try-catch
try {
  const response = await fetch(url, options);
  // ... handle response
} catch (networkError) {
  if (networkError instanceof TypeError) {
    throw new ProviderNetworkError(this.id);
  }
  throw networkError;
}
```

#### 6. Create EXTERNAL_PROVIDERS.md

```markdown
# External AI Providers

Saturday supports connecting external AI providers for advanced reasoning, multi-step tasks, and complex queries that benefit from frontier model capabilities.

## Supported Providers

### OpenAI
- **Models**: GPT-4, GPT-4o, o1-preview
- **Best for**: Deep reasoning, coding, function calling, structured output
- **Context window**: 128K tokens

### Anthropic Claude
- **Models**: Claude 3.5 Sonnet, Claude 3 Opus
- **Best for**: Long-context analysis, reasoning, coding, vision
- **Context window**: 200K tokens

### Google Gemini
- **Models**: Gemini 1.5 Pro, Gemini 1.5 Flash
- **Best for**: Multimodal tasks, fast inference, long context
- **Context window**: 1M tokens (Pro), 1M tokens (Flash)

## How to Get API Keys

### OpenAI
1. Visit [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (you won't be able to see it again)

### Anthropic
1. Visit [https://console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
2. Sign in or create an account
3. Click "Create Key"
4. Copy the key immediately

### Google
1. Visit [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

## Cost Implications

All external providers use token-based pricing. Tokens are roughly equivalent to words or word fragments.

### Pricing (per 1,000 tokens)

**OpenAI GPT-4o**
- Input: $0.0025
- Output: $0.01
- Typical message cost: ~$0.01-0.05

**Anthropic Claude 3.5 Sonnet**
- Input: $0.003
- Output: $0.015
- Typical message cost: ~$0.02-0.06

**Google Gemini 1.5 Pro**
- Input: $0.00125
- Output: $0.005
- Typical message cost: ~$0.005-0.025

**Google Gemini 1.5 Flash**
- Input: $0.000075
- Output: $0.0003
- Typical message cost: ~$0.0003-0.001

For official pricing details, visit:
- OpenAI: [https://openai.com/pricing](https://openai.com/pricing)
- Anthropic: [https://www.anthropic.com/pricing](https://www.anthropic.com/pricing)
- Google: [https://ai.google.dev/pricing](https://ai.google.dev/pricing)

## Privacy Considerations

### Data Transmission
When you use external AI providers, your messages and context are sent to third-party servers for processing. This is different from Saturday's default local AI, which keeps all data on your device.

### API Key Security
- Saturday stores your API keys securely using Android Keystore (via expo-secure-store)
- Keys are never logged, never sent to Saturday's servers (Saturday has no backend)
- Keys are encrypted at rest and only accessible by Saturday

### Provider Data Policies
- **OpenAI**: Data sent via API is not used to train models unless you opt in. 30-day retention for safety monitoring. [Privacy Policy](https://openai.com/policies/privacy-policy)
- **Anthropic**: Enterprise-grade privacy. Does not train on API data. [Privacy Policy](https://www.anthropic.com/legal/privacy)
- **Google**: Gemini API data is not used to train models. [Privacy Policy](https://support.google.com/gemini/answer/13594961)

### Your Control
- You can disconnect any provider at any time in Settings
- Saturday will always ask before using an external provider for sensitive tasks
- You can configure Saturday to prefer local AI in Privacy Controls

## Configuration

1. Open Saturday
2. Tap the Settings icon (top right)
3. Scroll to "External AI Providers"
4. Select the provider you want to connect
5. Tap "Connect"
6. Paste your API key
7. Tap "Test Connection" to verify
8. Tap "Save & Connect"

Saturday will now automatically use the external provider when appropriate for your tasks.

## Troubleshooting

### Invalid API Key Error
- Verify you copied the entire key with no extra spaces
- Check that the key hasn't been revoked in the provider's dashboard
- Ensure your account has API access enabled

### Rate Limit Error
- You've exceeded your provider's rate limit
- Wait a few minutes and try again
- Saturday will automatically fall back to local AI
- Consider upgrading your provider tier for higher limits

### Network Error
- Check your internet connection
- Verify you're not behind a restrictive firewall
- Try disconnecting and reconnecting the provider
- Saturday will use local AI as a fallback

### Connection Test Failed
- Ensure you have an active internet connection
- Verify the API key is correct and active
- Check the provider's status page for outages:
  - OpenAI: [https://status.openai.com](https://status.openai.com)
  - Anthropic: [https://status.anthropic.com](https://status.anthropic.com)
  - Google Cloud: [https://status.cloud.google.com](https://status.cloud.google.com)

### Provider Not Being Used
- Check that Privacy Controls allow external AI (Settings > Privacy Controls > Allow External AI Models)
- Verify the provider is still connected (green "Connected" badge)
- Some simple queries may route to local AI by design for speed and privacy
```

### Verification
Run `npm run typecheck`. Manually inspect IntegrationsScreen.tsx for UI correctness, errors.ts for new error classes, ConversationService.ts for error handling and fallback logic, and EXTERNAL_PROVIDERS.md for completeness.

---

## Summary

This plan delivers three distinct features:

1. **FEAT-001**: Provider adapters with real API integrations
2. **FEAT-002**: Routing intelligence and inline configuration modal
3. **FEAT-003**: IntegrationsScreen UI and comprehensive error handling

Each feature leaves the codebase in a working state. Verification is via typecheck and manual inspection since no test suite exists for external providers.
