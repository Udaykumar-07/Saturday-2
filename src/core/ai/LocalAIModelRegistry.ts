/**
 * Local AI Model Registry — catalog of validated on-device and local models.
 * Curated specifically for mobile edge inference performance and resource efficiency.
 */

export interface LocalModelInfo {
  id: string;
  name: string;
  provider: string;
  parameters: string;
  quantization: string;
  diskSize: string;
  contextWindow: number;
  description: string;
  recommended?: boolean;
  speedRating: 'Fast' | 'Ultra-Fast' | 'Moderate';
  bestFor: string;
}

export const LOCAL_MODELS: LocalModelInfo[] = [
  {
    id: 'qwen2.5:0.5b',
    name: 'Qwen 2.5 0.5B Instruct',
    provider: 'Alibaba Cloud',
    parameters: '0.49B',
    quantization: 'Q4_K_M',
    diskSize: '394 MB',
    contextWindow: 32768,
    description:
      'Top-tier sub-1B model with exceptional reasoning, instruction following, and multilingual support.',
    recommended: true,
    speedRating: 'Fast',
    bestFor: 'Everyday assistance, task extraction, fast phone actions',
  },
  {
    id: 'smollm2:360m',
    name: 'SmolLM2 360M Instruct',
    provider: 'Hugging Face',
    parameters: '360M',
    quantization: 'Q4_K_M',
    diskSize: '220 MB',
    contextWindow: 8192,
    description:
      'Ultra-lightweight architecture designed for instant mobile inference with tiny RAM footprint.',
    recommended: false,
    speedRating: 'Ultra-Fast',
    bestFor: 'Low-memory devices, offline quick replies, background classification',
  },
  {
    id: 'llama3.2:1b',
    name: 'Llama 3.2 1B Instruct',
    provider: 'Meta',
    parameters: '1.23B',
    quantization: 'Q4_K_M',
    diskSize: '750 MB',
    contextWindow: 131072,
    description:
      "Meta's official edge model built for on-device summarization, reasoning, and tool use.",
    recommended: false,
    speedRating: 'Moderate',
    bestFor: 'Detailed explanations, writing, long context understanding',
  },
  {
    id: 'gemma2:2b',
    name: 'Gemma 2 2B Instruct',
    provider: 'Google',
    parameters: '2.6B',
    quantization: 'Q4_K_M',
    diskSize: '1.6 GB',
    contextWindow: 8192,
    description:
      'Google lightweight model delivering high quality conversational responses.',
    recommended: false,
    speedRating: 'Moderate',
    bestFor: 'High-end devices with 6GB+ RAM',
  },
];

export const DEFAULT_LOCAL_MODEL_ID = 'qwen2.5:0.5b';

export class LocalAIModelRegistry {
  private models: Map<string, LocalModelInfo> = new Map();

  constructor() {
    for (const model of LOCAL_MODELS) {
      this.models.set(model.id, model);
    }
  }

  getAll(): LocalModelInfo[] {
    return Array.from(this.models.values());
  }

  get(id: string): LocalModelInfo | undefined {
    return this.models.get(id);
  }

  getDefault(): LocalModelInfo {
    return this.models.get(DEFAULT_LOCAL_MODEL_ID) || LOCAL_MODELS[0];
  }

  registerCustom(model: LocalModelInfo): void {
    this.models.set(model.id, model);
  }
}
