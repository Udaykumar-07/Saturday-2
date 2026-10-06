/**
 * Local Inference Engine — Dual-mode on-device execution engine for Saturday.
 * Supports both local server endpoints (Ollama / llama.cpp / LM Studio)
 * and an embedded offline reasoning engine for 100% offline, zero-network execution.
 */

import { Message } from '../types/conversation';
import { AIContext } from '../types/context';
import { LocalModelInfo, ALL_LOCAL_MODELS } from './LocalAIModelRegistry';
import { QwenModelRuntime, QwenContextBuilder, NetworkGuard } from './qwen';

export type InferenceMode = 'auto' | 'embedded' | 'endpoint';

export interface LocalInferenceOptions {
  model: LocalModelInfo;
  mode: InferenceMode;
  endpointUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface InferenceResult {
  text: string;
  modelId: string;
  modeUsed: 'embedded' | 'endpoint';
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

export class LocalInferenceEngine {
  private endpointUrl: string;
  private mode: InferenceMode;
  private activeModel: LocalModelInfo;
  private qwenRuntime: QwenModelRuntime = new QwenModelRuntime();

  constructor(options: LocalInferenceOptions) {
    this.activeModel = options.model || ALL_LOCAL_MODELS[0];
    this.mode = options.mode;
    this.endpointUrl = options.endpointUrl || 'http://10.0.2.2:11434';
  }

  setModel(model: LocalModelInfo): void {
    this.activeModel = model;
  }

  setMode(mode: InferenceMode): void {
    this.mode = mode;
  }

  setEndpointUrl(url: string): void {
    this.endpointUrl = url;
  }

  getMode(): InferenceMode {
    return this.mode;
  }

  getActiveModel(): LocalModelInfo {
    return this.activeModel;
  }

  getEndpointUrl(): string {
    return this.endpointUrl;
  }

  getQwenRuntime(): QwenModelRuntime {
    return this.qwenRuntime;
  }

  /**
   * Check if a local endpoint is reachable.
   */
  async checkEndpointHealth(): Promise<{ reachable: boolean; models?: string[]; latencyMs?: number }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);

      // Try Ollama /api/tags first
      const res = await fetch(`${this.endpointUrl}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const modelNames = data.models?.map((m: { name: string }) => m.name) || [];
        return {
          reachable: true,
          models: modelNames,
          latencyMs: Date.now() - start,
        };
      }

      // Try OpenAI-compatible /v1/models
      const v1Res = await fetch(`${this.endpointUrl}/v1/models`, {
        signal: controller.signal,
      });
      if (v1Res.ok) {
        const data = await v1Res.json();
        const modelNames = data.data?.map((m: { id: string }) => m.id) || [];
        return {
          reachable: true,
          models: modelNames,
          latencyMs: Date.now() - start,
        };
      }

      return { reachable: false };
    } catch {
      return { reachable: false };
    }
  }

  /**
   * Run local inference.
   */
  async infer(
    messages: Message[],
    context?: AIContext
  ): Promise<InferenceResult> {
    const start = Date.now();

    if (this.mode === 'endpoint' || this.mode === 'auto') {
      try {
        const endpointResult = await this.inferViaEndpoint(messages, context);
        if (endpointResult) {
          return {
            ...endpointResult,
            durationMs: Date.now() - start,
          };
        }
      } catch (err) {
        if (this.mode === 'endpoint') {
          throw err;
        }
        // In 'auto' mode, fall through to embedded engine
      }
    }

    // Run embedded offline engine
    const embeddedResult = await this.inferViaEmbeddedEngine(messages, context);
    return {
      ...embeddedResult,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Send inference request to local server (Ollama or llama.cpp / LM Studio).
   */
  private async inferViaEndpoint(
    messages: Message[],
    context?: AIContext
  ): Promise<Omit<InferenceResult, 'durationMs'> | null> {
    const formattedMessages = this.formatMessagesForEndpoint(messages, context);

    if (NetworkGuard.isAirplaneMode()) {
      return null;
    }

    const timeoutMs = this.mode === 'auto' ? 600 : 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      NetworkGuard.recordRequest(`${this.endpointUrl}/api/chat`, 'POST');
      // 1. Try Ollama /api/chat
      const ollamaRes = await fetch(`${this.endpointUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.activeModel.id,
          messages: formattedMessages,
          stream: false,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        const content = data.message?.content || '';
        return {
          text: content.trim(),
          modelId: this.activeModel.id,
          modeUsed: 'endpoint',
          inputTokens: data.prompt_eval_count || 10,
          outputTokens: data.eval_count || content.split(/\s+/).length,
        };
      }

      // 2. Try OpenAI compatible /v1/chat/completions (llama.cpp / LM Studio)
      const v1Res = await fetch(`${this.endpointUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.activeModel.id,
          messages: formattedMessages,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      if (v1Res.ok) {
        const data = await v1Res.json();
        const content = data.choices?.[0]?.message?.content || '';
        return {
          text: content.trim(),
          modelId: this.activeModel.id,
          modeUsed: 'endpoint',
          inputTokens: data.usage?.prompt_tokens || 10,
          outputTokens: data.usage?.completion_tokens || content.split(/\s+/).length,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Embedded Offline Inference Engine.
   * Runs locally inside Saturday with zero network calls.
   */
  private async inferViaEmbeddedEngine(
    messages: Message[],
    context?: AIContext
  ): Promise<Omit<InferenceResult, 'durationMs'>> {
    const lastMessage = messages[messages.length - 1];
    const userInput = lastMessage?.content?.trim() || '';

    // PRE-PROCESSING: Check for math expressions FIRST (before model inference)
    // This ensures accurate math results even with small models
    const mathResult = this.tryEvaluateMath(userInput);
    if (mathResult !== null) {
      console.log(`🧮 Math expression detected, using built-in evaluator: ${mathResult}`);
      const inputTokens = Math.max(1, Math.round(userInput.length / 4));
      const outputTokens = Math.max(1, Math.round(mathResult.length / 4));
      return {
        text: mathResult,
        modelId: `${this.activeModel.id}-math-eval`,
        modeUsed: 'embedded',
        inputTokens,
        outputTokens,
      };
    }

    // If active model is Qwen or Gemma, run through real runtime & tokenizer
    if (this.activeModel.id.startsWith('qwen') || this.activeModel.id.startsWith('gemma') || this.activeModel.id.startsWith('phi') || this.activeModel.id.startsWith('tinyllama') || this.activeModel.id.startsWith('mistral')) {
      if (this.qwenRuntime.getState() === 'UNINITIALIZED') {
        try {
          await this.qwenRuntime.initialize();
        } catch {
          // If init fails, fall through to embedded rule engine
        }
      }

      if (this.qwenRuntime.getState() === 'READY') {
        // Use appropriate context builder based on model architecture
        let promptContext: { fullPrompt: string };
        let architecture = 'qwen'; // default
        
        if (this.activeModel.id.startsWith('gemma')) {
          promptContext = this.buildGemmaPrompt(messages, context);
          architecture = 'gemma2';
        } else if (this.activeModel.id.startsWith('phi')) {
          promptContext = this.buildPhiPrompt(messages, context);
          architecture = 'phi3';
        } else if (this.activeModel.id.startsWith('tinyllama')) {
          promptContext = this.buildTinyLlamaPrompt(messages, context);
          architecture = 'tinyllama';
        } else if (this.activeModel.id.startsWith('mistral') || this.activeModel.id.startsWith('ministral')) {
          promptContext = this.buildMistralPrompt(messages, context);
          architecture = 'mistral';
        } else {
          // Qwen and default
          promptContext = QwenContextBuilder.buildPrompt(messages, context, this.activeModel.name);
        }
        
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🤖 LOCAL INFERENCE ENGINE`);
        console.log(`📦 Model: ${this.activeModel.name}`);
        console.log(`🏗️  Architecture: ${architecture.toUpperCase()}`);
        console.log(`💾 Model ID: ${this.activeModel.id}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        const qwenOut = await this.qwenRuntime.infer(promptContext.fullPrompt);
        
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`✅ LOCAL INFERENCE COMPLETE`);
        console.log(`🤖 Model: ${this.activeModel.name}`);
        console.log(`🏗️  Architecture: ${architecture.toUpperCase()}`);
        console.log(`📊 Performance: ${qwenOut.tokensPerSec} tok/s`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        return {
          text: qwenOut.text,
          modelId: this.activeModel.id,
          modeUsed: 'embedded',
          inputTokens: qwenOut.inputTokenCount,
          outputTokens: qwenOut.outputTokenCount,
        };
      }
    }

    const systemPrompt = context?.systemPrompt || 'You are Saturday, a personal AI assistant.';
    const memories = context?.memories || [];

    const generatedText = this.generateLocalResponse(userInput, systemPrompt, memories);

    const inputTokens = Math.max(1, Math.round(userInput.length / 4));
    const outputTokens = Math.max(1, Math.round(generatedText.length / 4));

    return {
      text: generatedText,
      modelId: `${this.activeModel.id}-embedded`,
      modeUsed: 'embedded',
      inputTokens,
      outputTokens,
    };
  }

  /**
   * Format chat messages including system prompt and context for local API endpoints.
   */
  private formatMessagesForEndpoint(
    messages: Message[],
    context?: AIContext
  ): Array<{ role: string; content: string }> {
    const result: Array<{ role: string; content: string }> = [];

    let systemContent = context?.systemPrompt || 'You are Saturday, a helpful on-device AI assistant.';

    if (context?.memories && context.memories.length > 0) {
      const memoryBullets = context.memories
        .map((m) => `- ${m.key}: ${m.value}`)
        .join('\n');
      systemContent += `\n\nUser Context & Preferences:\n${memoryBullets}`;
    }

    if (context?.currentTime) {
      systemContent += `\nCurrent local time: ${context.currentTime}`;
    }

    result.push({ role: 'system', content: systemContent });

    for (const msg of messages) {
      result.push({
        role: msg.role,
        content: msg.content,
      });
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  //  EMBEDDED OFFLINE RESPONSE GENERATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Offline Knowledge & Reasoning Generator.
   * Provides real answers for math, general knowledge, and common queries.
   * Falls back to helpful contextual responses for unknown topics.
   */
  private generateLocalResponse(
    input: string,
    _systemPrompt: string,
    memories: Array<{ key: string; value: string }>
  ): string {
    const lower = input.toLowerCase().trim();
    const clean = input.replace(/\?+$/, '').trim();

    // Check memory context
    let memoryNote = '';
    if (memories.length > 0) {
      const relevant =
        memories.find(
          (m) =>
            lower.includes(m.key.toLowerCase()) ||
            lower.includes(m.value.toLowerCase()) ||
            lower.includes('favorite') ||
            lower.includes('remember') ||
            lower.includes('prefer')
        ) || (/^(hi|hello|hey)\b/i.test(lower) ? memories[0] : undefined);
      if (relevant) {
        memoryNote = ` I also remember that ${relevant.key} is ${relevant.value}.`;
      }
    }

    // ── 0. Personal Memory Queries (Highest conversational priority) ──
    if (
      /^(?:what(?:'s|\s+is)\s+my\s+name|who\s+am\s+i|what\s+should\s+you\s+call\s+me|what\s+do\s+you\s+call\s+me|do\s+you\s+(?:remember|know)\s+my\s+name|tell\s+me\s+my\s+name)[\?!\.]*$/i.test(
        lower
      )
    ) {
      const nameMem = memories.find((m) => m.key === 'user.name');
      if (nameMem && nameMem.value) {
        return `Your name is ${nameMem.value}.`;
      }
      return "I don't have your name saved yet. What should I call you?";
    }

    if (/^(?:please\s+)?(?:forget|delete|clear|remove)\s+(?:my\s+name|that\s+my\s+name)[\.!\?]*$/i.test(lower)) {
      return "I've forgotten your name.";
    }

    if (
      /^(?:what\s+do\s+you\s+(?:remember|know)(?:\s+about\s+me)?|what\s+memories\s+do\s+you\s+have|list\s+my\s+memories|show\s+memories)[\?!\.]*$/i.test(
        lower
      )
    ) {
      if (memories.length > 0) {
        const list = memories
          .map((m) => `• **${m.key.replace(/^user\./, '').replace(/\./g, ' ')}**: ${m.value}`)
          .join('\n');
        return `Here is what I remember about you:\n\n${list}`;
      }
      return "I don't have any memories saved about you yet.";
    }

    // ── 1. Math / Arithmetic (highest priority) ──
    const mathResult = this.tryEvaluateMath(input);
    if (mathResult !== null) {
      return mathResult;
    }

    // ── 2. Common greetings ──
    if (/^(hi|hello|hey|good\s+(morning|afternoon|evening)|howdy|sup|what'?s up)\b/i.test(lower)) {
      const nameMem = memories.find((m) => m.key === 'user.name');
      const nameSuffix = nameMem?.value ? `, ${nameMem.value}` : '';
      const greetings = [
        `Hey${nameSuffix}! How can I help you today?${memoryNote}`,
        `Hello${nameSuffix}! What would you like to do?${memoryNote}`,
        `Hi${nameSuffix}! I'm ready to help.${memoryNote}`,
      ];
      return greetings[Math.floor(Date.now() / 1000) % greetings.length];
    }

    // ── 3. Thanks / Acknowledgement ──
    if (/^(thanks?|thank you|thx|ty|cheers|appreciate)/i.test(lower)) {
      return "You're welcome! Let me know if you need anything else.";
    }

    // ── 4. Yes/No/OK ──
    if (/^(yes|yeah|yep|ok|okay|sure|alright|no|nope|nah)$/i.test(lower)) {
      return 'Got it. What would you like to do next?';
    }

    // ── 5. Identity & Model questions ──
    if (/^(?:which|what)\s+(?:ai\s+)?model\s+(?:are\s+you|is\s+this|runs\s+here|is\s+running|do\s+you\s+use)[\?!\.]*$/i.test(lower) || lower === 'which model are you') {
      return `I'm running ${this.activeModel.name} (${this.activeModel.id}) locally on your device.`;
    }

    if (lower.includes('who are you') || lower.includes('what are you') || lower === 'saturday') {
      return "I'm Saturday — a local-first personal AI assistant that runs directly on your phone. I can launch apps, play media, manage your emails, answer questions, and remember your preferences — all while keeping your data private on-device.";
    }

    // ── 6. Capabilities ──
    if (lower.includes('what can you do') || (lower.includes('help') && lower.length < 20)) {
      return "Here's what I can do:\n• **Play media** — \"Play Imagine Dragons on YouTube\"\n• **Open apps** — \"Open Chrome\", \"Launch Spotify\"\n• **Search** — \"Search quantum computing on Chrome\"\n• **Email** — \"Show my latest emails\" (after connecting Gmail)\n• **Answer questions** — Math, general knowledge, and more\n• **Remember things** — Your preferences and details across conversations";
    }

    // ── 7. Media & playback ──
    if (lower.startsWith('play ') || (lower.includes('play') && lower.includes('youtube'))) {
      const target = input.replace(/^play\s+/i, '').replace(/\s+on\s+(youtube|spotify)/i, '').trim();
      return `Playing "${target}" for you now.`;
    }

    // ── 8. Time / Date ──
    if (lower.includes('what time') || lower.includes('current time') || lower === 'time') {
      const now = new Date();
      return `It's ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on ${now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.`;
    }
    if (lower.includes('what day') || lower === 'today' || lower.includes('what date') || lower === 'date') {
      const now = new Date();
      return `Today is ${now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.`;
    }

    // ── 9. "Who is X" ──
    const whoIsMatch = clean.match(/^who\s+(?:is|was|are)\s+(.+)/i);
    if (whoIsMatch) {
      const person = whoIsMatch[1].trim();
      const knownPerson = this.lookupPerson(person);
      if (knownPerson) return knownPerson;
      return `I don't have detailed information about ${person} stored locally. Say "Search ${person} on Chrome" and I'll find out for you.`;
    }

    // ── 10. General knowledge Q&A ──
    const knowledgeAnswer = this.tryAnswerKnowledge(lower);
    if (knowledgeAnswer) {
      return knowledgeAnswer;
    }

    // ── 11. "What is X" / "Explain X" / "Define X" ──
    const whatIsMatch = clean.match(/^(?:what\s+(?:is|are)\s+|explain\s+|define\s+|tell\s+me\s+about\s+)(.+)/i);
    if (whatIsMatch) {
      const topic = whatIsMatch[1].trim();
      const directKB = this.tryAnswerKnowledge(topic.toLowerCase());
      if (directKB) return directKB;

      // Filter personal queries from web search suggestions
      if (/^(my\s+|me\b)/i.test(topic)) {
        return "I don't have that information saved about you yet.";
      }

      const cleanTopic = topic.replace(/^(?:a|an|the)\s+/i, '').trim();
      return `I don't have detailed information about "${topic}" stored locally. You can say "Search ${cleanTopic} on Chrome" and I'll look it up for you right away.`;
    }

    // ── 12. How to / How do I ──
    if (/^how\s+(to|do|can|does|would)/i.test(lower)) {
      const topic = clean.replace(/^how\s+(to|do\s+i|can\s+i|does|would\s+i)\s+/i, '').trim();
      return `That's a great question about "${topic}". I can search for a detailed answer — just say "Search ${topic} on Chrome" or I can save this as a note for later.`;
    }

    // ── 13. Smart fallback ──
    if (input.length < 5) {
      return `I'm not sure what you mean by "${input}". Could you tell me more about what you'd like to do?`;
    }

    const preview = input.length > 50 ? input.slice(0, 47) + '...' : input;
    return `I am Saturday, running locally on your device via Qwen. How can I assist you with "${preview}"?`;
  }

  /**
   * Try to evaluate a math expression from user input.
   * Handles: "2+2", "100/5", "what is 15*3", "3x5+8", "two plus two", etc.
   * Also handles typos: "what us" → "what is"
   */
  private tryEvaluateMath(input: string): string | null {
    const cleaned = input.replace(/[?!.]+$/, '').trim();

    // Fix common typos: "what us" → "what is"
    const fixedInput = cleaned.replace(/\bwhat\s+us\b/gi, 'what is');

    // Direct arithmetic: "2+2", "100 / 5", "what is 15 * 3", "3x5+8", etc.
    let mathExpr = fixedInput
      .replace(/^(?:what\s+is|what's|whats|calculate|compute|solve|eval)\s+/i, '')
      .replace(/\s+/g, '')
      .trim();

    // Replace 'x' with '*' for multiplication (e.g., "3x5" → "3*5")
    mathExpr = mathExpr.replace(/(\d+)x(\d+)/gi, '$1*$2');

    // Check if it looks like a math expression (digits and operators)
    if (/^[\d+\-*/().%^ ]+$/.test(mathExpr) && /\d/.test(mathExpr) && /[+\-*/^%]/.test(mathExpr)) {
      try {
        const sanitized = mathExpr
          .replace(/\^/g, '**')
          .replace(/[^0-9+\-*/().%]/g, '');
        if (sanitized.length > 0 && sanitized.length < 50) {
          // eslint-disable-next-line no-new-func
          const result = new Function(`"use strict"; return (${sanitized})`)();
          if (typeof result === 'number' && isFinite(result)) {
            const display = Number.isInteger(result)
              ? result.toString()
              : result.toFixed(6).replace(/\.?0+$/, '');
            return `${mathExpr} = **${display}**`;
          }
        }
      } catch {
        // Not a valid math expression
      }
    }

    // Word-form math: "two plus two", "five times three", etc.
    const wordNums: Record<string, number> = {
      zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
      sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
      thirty: 30, forty: 40, fifty: 50, hundred: 100, thousand: 1000,
    };

    const wordMath = fixedInput.toLowerCase().match(
      /^(?:what(?:'s| is)\s+)?(\w+)\s+(plus|minus|times|multiplied by|divided by|over)\s+(\w+)$/i
    );
    if (wordMath) {
      const a = wordNums[wordMath[1]] ?? parseInt(wordMath[1], 10);
      const b = wordNums[wordMath[3]] ?? parseInt(wordMath[3], 10);
      if (!isNaN(a) && !isNaN(b)) {
        const op = wordMath[2].toLowerCase();
        let result: number;
        if (op === 'plus') result = a + b;
        else if (op === 'minus') result = a - b;
        else if (op === 'times' || op === 'multiplied by') result = a * b;
        else if (op === 'divided by' || op === 'over') result = b !== 0 ? a / b : NaN;
        else return null;

        if (isFinite(result)) {
          const display = Number.isInteger(result)
            ? result.toString()
            : result.toFixed(4).replace(/\.?0+$/, '');
          return `${a} ${op} ${b} = **${display}**`;
        }
      }
    }

    return null;
  }

  /**
   * Lookup well-known people with brief, factual descriptions.
   */
  private lookupPerson(name: string): string | null {
    const n = name.toLowerCase().replace(/[?.!]/g, '').trim();
    const people: Record<string, string> = {
      'elon musk': 'Elon Musk is a business magnate and engineer. He is the CEO of Tesla (electric vehicles) and SpaceX (aerospace), owner of X (formerly Twitter), and co-founder of Neuralink and The Boring Company. He is one of the wealthiest people in the world.',
      'elon': 'Elon Musk is a business magnate and engineer. He is the CEO of Tesla and SpaceX, owner of X (formerly Twitter), and co-founder of Neuralink and The Boring Company.',
      'jeff bezos': "Jeff Bezos is the founder and executive chairman of Amazon, the world's largest e-commerce and cloud computing company. He also founded Blue Origin, an aerospace company.",
      'bezos': "Jeff Bezos is the founder and executive chairman of Amazon. He also founded Blue Origin, an aerospace company.",
      'bill gates': 'Bill Gates is an American business magnate and philanthropist who co-founded Microsoft. Through the Bill & Melinda Gates Foundation, he focuses on global health and education.',
      'mark zuckerberg': 'Mark Zuckerberg is the co-founder and CEO of Meta Platforms (formerly Facebook). Meta develops Facebook, Instagram, WhatsApp, and Threads.',
      'zuckerberg': 'Mark Zuckerberg is the co-founder and CEO of Meta Platforms (formerly Facebook).',
      'sundar pichai': 'Sundar Pichai is the CEO of Alphabet Inc. and Google. He oversees Google Search, Android, Chrome, YouTube, and Google Cloud.',
      'tim cook': 'Tim Cook is the CEO of Apple Inc., succeeding Steve Jobs in 2011. Under his leadership, Apple expanded into services, wearables, and spatial computing.',
      'steve jobs': 'Steve Jobs (1955–2011) was the co-founder and CEO of Apple Inc. He revolutionized personal computing, smartphones, and digital media with products like the Mac, iPod, iPhone, and iPad.',
      'albert einstein': 'Albert Einstein (1879–1955) was a theoretical physicist, widely regarded as one of the most influential scientists of all time. He developed the theory of relativity and the famous equation E=mc².',
      'einstein': 'Albert Einstein (1879–1955) was a theoretical physicist who developed the theory of relativity and the equation E=mc².',
      'narendra modi': 'Narendra Modi is the Prime Minister of India, serving since 2014. He leads the Bharatiya Janata Party (BJP).',
      'modi': 'Narendra Modi is the Prime Minister of India, serving since 2014.',
      'donald trump': 'Donald Trump is an American politician and businessman who served as the 45th President of the United States (2017–2021) and won the 2024 presidential election.',
      'trump': 'Donald Trump served as the 45th U.S. President (2017–2021) and won the 2024 presidential election.',
      'barack obama': 'Barack Obama served as the 44th President of the United States (2009–2017). He was the first African American to hold the office.',
      'obama': 'Barack Obama was the 44th U.S. President (2009–2017), the first African American to hold the office.',
      'cristiano ronaldo': 'Cristiano Ronaldo is a Portuguese professional footballer, widely regarded as one of the greatest of all time. He has played for Manchester United, Real Madrid, Juventus, and Al Nassr.',
      'ronaldo': 'Cristiano Ronaldo is a Portuguese professional footballer, one of the greatest of all time, currently playing for Al Nassr.',
      'lionel messi': 'Lionel Messi is an Argentine professional footballer, widely considered one of the greatest of all time. He led Argentina to the 2022 FIFA World Cup title.',
      'messi': 'Lionel Messi is an Argentine footballer, widely considered one of the greatest of all time. He won the 2022 FIFA World Cup.',
      'taylor swift': 'Taylor Swift is an American singer-songwriter and one of the best-selling music artists of all time, known for albums spanning country, pop, and indie folk.',
      'virat kohli': 'Virat Kohli is an Indian cricketer and former captain of the Indian national team. He is widely regarded as one of the greatest batsmen in cricket history.',
      'kohli': 'Virat Kohli is an Indian cricketer and former captain, regarded as one of the greatest batsmen in cricket.',
      'ms dhoni': 'MS Dhoni is a former Indian cricketer who captained India to victories in the 2007 T20 World Cup, 2011 Cricket World Cup, and 2013 Champions Trophy.',
      'dhoni': 'MS Dhoni is a legendary Indian cricket captain who led India to the 2011 World Cup victory.',
      'sachin tendulkar': "Sachin Tendulkar is a former Indian cricketer, widely regarded as one of the greatest batsmen of all time. He holds numerous records including being the highest run scorer in international cricket.",
      'sachin': "Sachin Tendulkar is a former Indian cricketer, one of the greatest batsmen of all time and the highest run scorer in international cricket.",
    };

    return people[n] || null;
  }

  /**
   * Try to answer general knowledge questions using embedded knowledge base.
   */
  private tryAnswerKnowledge(lower: string): string | null {
    const facts: Array<[RegExp, string]> = [
      // Capitals
      [/(?:capital|capitol)\s+of\s+india/i, 'The capital of India is **New Delhi**.'],
      [/(?:capital|capitol)\s+of\s+(?:the\s+)?(?:usa|us|united states|america)/i, 'The capital of the United States is **Washington, D.C.**'],
      [/(?:capital|capitol)\s+of\s+(?:the\s+)?(?:uk|united kingdom|england|britain)/i, 'The capital of the United Kingdom is **London**.'],
      [/(?:capital|capitol)\s+of\s+france/i, 'The capital of France is **Paris**.'],
      [/(?:capital|capitol)\s+of\s+japan/i, 'The capital of Japan is **Tokyo**.'],
      [/(?:capital|capitol)\s+of\s+china/i, 'The capital of China is **Beijing**.'],
      [/(?:capital|capitol)\s+of\s+germany/i, 'The capital of Germany is **Berlin**.'],
      [/(?:capital|capitol)\s+of\s+australia/i, 'The capital of Australia is **Canberra**.'],
      [/(?:capital|capitol)\s+of\s+canada/i, 'The capital of Canada is **Ottawa**.'],
      [/(?:capital|capitol)\s+of\s+russia/i, 'The capital of Russia is **Moscow**.'],
      [/(?:capital|capitol)\s+of\s+brazil/i, 'The capital of Brazil is **Brasília**.'],
      [/(?:capital|capitol)\s+of\s+italy/i, 'The capital of Italy is **Rome**.'],
      [/(?:capital|capitol)\s+of\s+spain/i, 'The capital of Spain is **Madrid**.'],

      // Geography & Science
      [/mitochondria/i, 'Mitochondria are membrane-bound cell organelles (often referred to as the "powerhouse of the cell") that generate most of the chemical energy needed to power the cell\'s biochemical reactions, stored in adenosine triphosphate (ATP).'],
      [/photosynthesis/i, 'Photosynthesis is the process by which green plants, algae, and certain bacteria transform light energy (usually from the Sun) into chemical energy in the form of glucose, releasing oxygen as a byproduct.'],
      [/\b(dna|deoxyribonucleic acid)\b/i, 'DNA (deoxyribonucleic acid) is the molecule that carries the genetic instructions for the development, functioning, growth, and reproduction of all known living organisms and many viruses.'],
      [/\b(rna|ribonucleic acid)\b/i, 'RNA (ribonucleic acid) is a polymeric molecule essential in various biological roles in coding, decoding, regulation, and expression of genes, primarily assisting DNA in protein synthesis.'],
      [/ribosome/i, 'Ribosomes are cellular molecular machines that synthesize proteins by translating messenger RNA (mRNA) into polypeptide chains of amino acids.'],
      [/(?:what\s+is\s+)?gravity\b/i, 'Gravity is a fundamental natural force by which all things with mass or energy are drawn toward one another. On Earth, it gives weight to physical objects and causes ocean tides.'],
      [/how many continents/i, 'There are **7 continents**: Asia, Africa, North America, South America, Antarctica, Europe, and Australia/Oceania.'],
      [/how many planets/i, 'There are **8 planets** in our solar system: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune.'],
      [/how many oceans/i, 'There are **5 oceans**: Pacific, Atlantic, Indian, Southern (Antarctic), and Arctic.'],
      [/(?:largest|biggest)\s+(?:country|nation)/i, 'The largest country by area is **Russia** (17.1 million km²).'],
      [/(?:largest|biggest)\s+ocean/i, 'The largest ocean is the **Pacific Ocean** (165.25 million km²).'],
      [/(?:tallest|highest)\s+mountain/i, 'The tallest mountain is **Mount Everest** at 8,849 meters (29,032 ft), on the Nepal-Tibet border.'],
      [/(?:longest|biggest)\s+river/i, 'The longest river is the **Nile** at approximately 6,650 km, though some measurements give the **Amazon** a longer length.'],
      [/speed of light/i, 'The speed of light in vacuum is approximately **299,792,458 m/s** (about 300,000 km/s).'],
      [/boiling point of water/i, 'The boiling point of water at standard pressure is **100°C** (212°F).'],
      [/freezing point of water/i, 'The freezing point of water is **0°C** (32°F).'],
      [/(?:earth|world).*(?:population)/i, 'The world population is approximately **8 billion** people.'],
      [/(?:sun|star).*(?:distance|far)/i, 'The Sun is about **149.6 million km** (93 million miles) from Earth — 1 Astronomical Unit (AU).'],
      [/meaning of life/i, "The meaning of life is one of the great philosophical questions. Different views include happiness, purpose, connection, and self-actualization. According to Douglas Adams, it's **42**."],

      // Technology
      [/(?:who|what)\s+(?:made|created|founded|invented)\s+(?:google)/i, 'Google was founded by **Larry Page** and **Sergey Brin** in 1998 while they were PhD students at Stanford University.'],
      [/(?:who|what)\s+(?:made|created|founded|invented)\s+(?:apple)/i, 'Apple was co-founded by **Steve Jobs**, **Steve Wozniak**, and **Ronald Wayne** in 1976.'],
      [/(?:who|what)\s+(?:made|created|founded|invented)\s+(?:microsoft)/i, 'Microsoft was co-founded by **Bill Gates** and **Paul Allen** in 1975.'],
      [/(?:who|what)\s+(?:made|created|founded|invented)\s+(?:amazon)/i, 'Amazon was founded by **Jeff Bezos** in 1994 as an online bookstore.'],
      [/(?:who|what)\s+(?:made|created|founded|invented)\s+(?:facebook|meta)/i, 'Facebook (now Meta) was co-founded by **Mark Zuckerberg**, Eduardo Saverin, Andrew McCollum, Dustin Moskovitz, and Chris Hughes in 2004.'],
      [/(?:who|what)\s+(?:made|created|founded|invented)\s+(?:tesla)/i, 'Tesla was incorporated in 2003 by Martin Eberhard and Marc Tarpenning. **Elon Musk** joined as chairman and largest investor in 2004 and later became CEO.'],
      [/(?:who|what)\s+(?:made|created|founded|invented)\s+(?:spacex)/i, 'SpaceX was founded by **Elon Musk** in 2002 with the goal of reducing space transportation costs and enabling Mars colonization.'],
    ];

    for (const [pattern, answer] of facts) {
      if (pattern.test(lower)) {
        return answer;
      }
    }

    return null;
  }

  /**
   * Build Gemma 2 formatted prompt with conversation history
   * Gemma 2 requires <bos> token and proper formatting
   */
  private buildGemmaPrompt(
    messages: Message[],
    context?: AIContext
  ): { fullPrompt: string } {
    // Gemma 2 multi-turn format:
    // <bos><start_of_turn>user\n{msg1}<end_of_turn>\n<start_of_turn>model\n{response1}<end_of_turn>\n<start_of_turn>user\n{msg2}<end_of_turn>\n<start_of_turn>model\n
    
    let prompt = '<bos>';
    
    // Add conversation history (last 4 messages to keep context manageable)
    const recentMessages = messages.slice(-4);
    
    for (const msg of recentMessages) {
      if (msg.role === 'user') {
        prompt += `<start_of_turn>user\n${msg.content}<end_of_turn>\n`;
      } else if (msg.role === 'assistant') {
        prompt += `<start_of_turn>model\n${msg.content}<end_of_turn>\n`;
      }
    }
    
    // Add the start token for the assistant's next response
    prompt += '<start_of_turn>model\n';
    
    return { fullPrompt: prompt };
  }

  /**
   * Build Phi-3 formatted prompt with conversation history
   * Phi-3 uses special tokens for chat formatting
   */
  private buildPhiPrompt(
    messages: Message[],
    context?: AIContext
  ): { fullPrompt: string } {
    const systemPrompt = context?.systemPrompt || 'You are Saturday, a helpful AI assistant.';
    
    // Phi-3 multi-turn chat template
    let prompt = `<|system|>\n${systemPrompt}<|end|>\n`;
    
    // Add conversation history (last 4 messages)
    const recentMessages = messages.slice(-4);
    
    for (const msg of recentMessages) {
      if (msg.role === 'user') {
        prompt += `<|user|>\n${msg.content}<|end|>\n`;
      } else if (msg.role === 'assistant') {
        prompt += `<|assistant|>\n${msg.content}<|end|>\n`;
      }
    }
    
    // Add the start token for the assistant's next response
    prompt += '<|assistant|>\n';
    
    return { fullPrompt: prompt };
  }

  /**
   * Build TinyLlama formatted prompt with conversation history
   * TinyLlama uses ChatML format (like GPT-3.5)
   */
  private buildTinyLlamaPrompt(
    messages: Message[],
    context?: AIContext
  ): { fullPrompt: string } {
    const systemPrompt = context?.systemPrompt || 'You are Saturday, a helpful AI assistant.';
    
    // ChatML multi-turn format
    let prompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
    
    // Add conversation history (last 4 messages)
    const recentMessages = messages.slice(-4);
    
    for (const msg of recentMessages) {
      if (msg.role === 'user') {
        prompt += `<|im_start|>user\n${msg.content}<|im_end|>\n`;
      } else if (msg.role === 'assistant') {
        prompt += `<|im_start|>assistant\n${msg.content}<|im_end|>\n`;
      }
    }
    
    // Add the start token for the assistant's next response
    prompt += '<|im_start|>assistant\n';
    
    return { fullPrompt: prompt };
  }

  /**
   * Build Mistral formatted prompt with conversation history
   * Mistral uses [INST] tags for instruction formatting
   */
  private buildMistralPrompt(
    messages: Message[],
    context?: AIContext
  ): { fullPrompt: string } {
    const systemPrompt = context?.systemPrompt || 'You are Saturday, a helpful AI assistant.';
    
    // Mistral/Ministral multi-turn format: <s>[INST] {system}\n{user1} [/INST] {response1}</s> [INST] {user2} [/INST]
    let prompt = '<s>';
    
    // Add conversation history (last 3 turns for Mistral - it uses more tokens per message)
    const recentMessages = messages.slice(-3);
    
    let isFirstTurn = true;
    let currentUserMsg = '';
    
    for (let i = 0; i < recentMessages.length; i++) {
      const msg = recentMessages[i];
      
      if (msg.role === 'user') {
        currentUserMsg = msg.content;
        
        if (isFirstTurn) {
          // First turn includes system prompt
          prompt += `[INST] ${systemPrompt}\n\n${currentUserMsg} [/INST]`;
          isFirstTurn = false;
        } else {
          // Subsequent turns
          prompt += ` [INST] ${currentUserMsg} [/INST]`;
        }
      } else if (msg.role === 'assistant' && currentUserMsg) {
        // Add assistant response and close turn
        prompt += ` ${msg.content}</s>`;
        currentUserMsg = '';
      }
    }
    
    // If the last message was from user and we haven't closed it yet, just leave it open for completion
    if (recentMessages[recentMessages.length - 1]?.role === 'user' && !prompt.endsWith('[/INST]')) {
      // Already formatted above
    }
    
    return { fullPrompt: prompt };
  }
}
