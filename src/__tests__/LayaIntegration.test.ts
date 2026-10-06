/**
 * Tests for Laya on-device intent classification system.
 *
 * Tests the sequence builder, tokenizer, runtime, and intent classifier
 * without requiring the actual ONNX model (uses mock session).
 */

import { buildSequence, softmax, confidenceFromProbs, tempBucket, QTYPES } from '../core/ai/laya/LayaSequence';
import { toInternal, renderOptions } from '../core/ai/laya/LayaSequence';
import type { SpecialIds, Encode } from '../core/ai/laya/LayaSequence';
import type { Question, ChoiceQuestion, NoulQuestion, ScoreQuestion, LayaModelConfig } from '../core/ai/laya/LayaTypes';
import { LayaRuntime, type OnnxSession } from '../core/ai/laya/LayaRuntime';
import { LayaTokenizer } from '../core/ai/laya/LayaTokenizer';
import { LayaIntentClassifier } from '../core/ai/laya/LayaIntentClassifier';

// ── Sequence Builder Tests ──

describe('LayaSequence', () => {
  describe('softmax', () => {
    it('should produce probabilities that sum to 1', () => {
      const result = softmax([1, 2, 3]);
      const sum = result.reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - 1)).toBeLessThan(1e-6);
    });

    it('should handle equal logits', () => {
      const result = softmax([0, 0, 0]);
      expect(result[0]).toBeCloseTo(1 / 3, 5);
      expect(result[1]).toBeCloseTo(1 / 3, 5);
      expect(result[2]).toBeCloseTo(1 / 3, 5);
    });

    it('should assign highest probability to largest logit', () => {
      const result = softmax([1, 5, 2]);
      expect(result[1]).toBeGreaterThan(result[0]);
      expect(result[1]).toBeGreaterThan(result[2]);
    });
  });

  describe('confidenceFromProbs', () => {
    it('should return 1 for a deterministic distribution', () => {
      expect(confidenceFromProbs([1, 0, 0])).toBeCloseTo(1, 5);
    });

    it('should return 0 for a uniform distribution', () => {
      expect(confidenceFromProbs([0.5, 0.5])).toBeCloseTo(0, 5);
    });

    it('should return higher confidence for more peaked distributions', () => {
      const peaked = confidenceFromProbs([0.9, 0.05, 0.05]);
      const flat = confidenceFromProbs([0.4, 0.3, 0.3]);
      expect(peaked).toBeGreaterThan(flat);
    });
  });

  describe('tempBucket', () => {
    it('should return correct bucket keys', () => {
      expect(tempBucket(QTYPES.choice, 2)).toBe('choice:2');
      expect(tempBucket(QTYPES.choice, 4)).toBe('choice:3-5');
      expect(tempBucket(QTYPES.choice, 8)).toBe('choice:6-10');
      expect(tempBucket(QTYPES.choice, 15)).toBe('choice:11+');
      expect(tempBucket(QTYPES.score, 4)).toBe('score:3-5');
      expect(tempBucket(QTYPES.noul, 2)).toBe('noul:2');
    });
  });

  describe('toInternal + renderOptions', () => {
    it('should render choice options with descriptions', () => {
      const q: ChoiceQuestion = {
        type: 'choice',
        instructions: 'Pick one',
        criteria: { CHAT: 'Casual chat', SEARCH: 'Web search' },
      };
      const internal = toInternal(q);
      const opts = renderOptions(internal);
      expect(opts).toEqual(['CHAT: Casual chat', 'SEARCH: Web search']);
    });

    it('should render noul options as false/true', () => {
      const q: NoulQuestion = {
        type: 'noul',
        instructions: 'Is this a fact?',
      };
      const internal = toInternal(q);
      const opts = renderOptions(internal);
      expect(opts.length).toBe(2);
      expect(opts[0]).toContain('false');
      expect(opts[1]).toContain('true');
    });

    it('should render score options with level indices', () => {
      const q: ScoreQuestion = {
        type: 'score',
        instructions: 'Rate urgency',
        criteria: ['Low', 'Medium', 'High'],
      };
      const internal = toInternal(q);
      const opts = renderOptions(internal);
      expect(opts).toEqual(['level 0: Low', 'level 1: Medium', 'level 2: High']);
    });
  });

  describe('buildSequence', () => {
    const mockSpecialIds: SpecialIds = {
      cls: 101,
      sep: 102,
      mask: 103,
      pad: 0,
      maskTok: '[MASK]',
    };

    // Simple mock encoder: each character → ASCII code
    const mockEncode: Encode = (text: string) =>
      Array.from(text).map((c) => c.charCodeAt(0));

    it('should build a sequence with CLS, SEP, and MASK markers', () => {
      const q: ChoiceQuestion = {
        type: 'choice',
        instructions: 'Pick',
        criteria: { A: 'Option A', B: 'Option B' },
      };
      const internal = toInternal(q);
      const result = buildSequence(mockEncode, mockSpecialIds, 'hello', internal, 512, 192);

      // Should start with CLS
      expect(result.ids[0]).toBe(101);
      // Should have markers for each option
      expect(result.markers.length).toBe(2);
      // Markers should point to MASK tokens
      for (const m of result.markers) {
        expect(result.ids[m]).toBe(103);
      }
    });

    it('should not exceed maxLen', () => {
      const q: ChoiceQuestion = {
        type: 'choice',
        instructions: 'A very long instruction '.repeat(50),
        criteria: { A: null, B: null },
      };
      const internal = toInternal(q);
      const result = buildSequence(mockEncode, mockSpecialIds, 'x'.repeat(1000), internal, 64, 32);
      expect(result.ids.length).toBeLessThanOrEqual(64);
    });
  });
});

// ── Tokenizer Tests ──

describe('LayaTokenizer', () => {
  it('should load from a minimal BPE tokenizer.json', () => {
    const json = {
      model: {
        type: 'BPE',
        vocab: {
          'h': 0, 'e': 1, 'l': 2, 'o': 3, ' ': 4,
          'he': 5, 'llo': 6, '[CLS]': 7, '[SEP]': 8, '[MASK]': 9, '[PAD]': 10, '[UNK]': 11,
        },
        merges: ['h e', 'l o', 'l lo'],
        unk_token: '[UNK]',
      },
      added_tokens: [
        { id: 7, content: '[CLS]', special: true },
        { id: 8, content: '[SEP]', special: true },
        { id: 9, content: '[MASK]', special: true },
        { id: 10, content: '[PAD]', special: true },
        { id: 11, content: '[UNK]', special: true },
      ],
      pre_tokenizer: { type: 'Whitespace' },
    };

    const tok = LayaTokenizer.fromJSON(json as any);
    expect(tok.tokenToId('[CLS]')).toBe(7);
    expect(tok.tokenToId('[SEP]')).toBe(8);
    expect(tok.tokenToId('[MASK]')).toBe(9);
    expect(tok.tokenToId('[PAD]')).toBe(10);
    expect(tok.vocabSize).toBeGreaterThan(0);
  });

  it('should encode text to token IDs', () => {
    const json = {
      model: {
        type: 'BPE',
        vocab: { 'a': 0, 'b': 1, 'c': 2, 'ab': 3, '[UNK]': 4 },
        merges: ['a b'],
        unk_token: '[UNK]',
      },
      added_tokens: [{ id: 4, content: '[UNK]', special: true }],
      pre_tokenizer: { type: 'Whitespace' },
    };

    const tok = LayaTokenizer.fromJSON(json as any);
    const ids = tok.encode('abc');
    // 'a' + 'b' should merge to 'ab', then 'c' is separate
    expect(ids).toEqual([3, 2]);
  });
});

// ── Runtime + Classifier Tests ──

describe('LayaRuntime', () => {
  it('should start in NOT_LOADED state', () => {
    const runtime = new LayaRuntime();
    expect(runtime.state).toBe('NOT_LOADED');
    expect(runtime.isReady).toBe(false);
  });

  it('should transition to READY after initialize()', () => {
    const runtime = new LayaRuntime();
    const mockSession: OnnxSession = {
      run: jest.fn(),
    };
    const tokJson = {
      model: {
        type: 'BPE',
        vocab: { '[CLS]': 0, '[SEP]': 1, '[MASK]': 2, '[PAD]': 3, '[UNK]': 4, 'a': 5 },
        merges: [],
        unk_token: '[UNK]',
      },
      added_tokens: [],
      pre_tokenizer: { type: 'Whitespace' },
    };
    const tokenizer = LayaTokenizer.fromJSON(tokJson as any);
    const config: LayaModelConfig = {
      max_len: 512,
      head_max_len: 192,
      temperature: [1.6, 1.25, 1.98],
      temperature_by_options: {},
    };

    runtime.initialize(mockSession, tokenizer, config);
    expect(runtime.state).toBe('READY');
    expect(runtime.isReady).toBe(true);
  });

  it('should throw if systemOne called before initialize', async () => {
    const runtime = new LayaRuntime();
    await expect(
      runtime.systemOne('hello', {
        q: { type: 'noul', instructions: 'test' },
      })
    ).rejects.toThrow('not initialized');
  });
});

describe('LayaIntentClassifier', () => {
  it('should return null when runtime is not ready', async () => {
    const runtime = new LayaRuntime();
    const classifier = new LayaIntentClassifier(runtime);
    const result = await classifier.classify('hello');
    expect(result).toBeNull();
  });

  it('should classify using Laya when runtime is ready', async () => {
    const runtime = new LayaRuntime();

    // Create mock session that returns deterministic logits
    const mockSession: OnnxSession = {
      run: jest.fn().mockResolvedValue({
        logits: {
          data: new Float32Array([
            // 13 options for task_type (CHAT wins at index 0)
            10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
            // padding to K width
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            // 2 options for is_personal_fact (noul)
            -5, -5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            // 4 options for urgency (score)
            5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          ]),
          dims: [3, 13],
        },
        act_probs: {
          data: new Float32Array([0.5, 0.5, 0.5]),
          dims: [3, 1],
        },
      }),
    };

    const tokJson = {
      model: {
        type: 'BPE',
        vocab: {
          '[CLS]': 0, '[SEP]': 1, '[MASK]': 2, '[PAD]': 3, '[UNK]': 4,
          'h': 5, 'e': 6, 'l': 7, 'o': 8, ' ': 9,
          'c': 10, 'a': 11, 't': 12,
          'q': 13, 'u': 14, 's': 15, 'i': 16, 'n': 17,
          'r': 18, 'f': 19, 'v': 20, ':': 21,
          'he': 22, 'ch': 23, 'lo': 24, 'oi': 25,
        },
        merges: ['h e', 'c h', 'l o', 'o i'],
        unk_token: '[UNK]',
      },
      added_tokens: [
        { id: 0, content: '[CLS]', special: true },
        { id: 1, content: '[SEP]', special: true },
        { id: 2, content: '[MASK]', special: true },
        { id: 3, content: '[PAD]', special: true },
      ],
      pre_tokenizer: { type: 'Whitespace' },
    };

    const tokenizer = LayaTokenizer.fromJSON(tokJson as any);
    const config: LayaModelConfig = {
      max_len: 512,
      head_max_len: 192,
      temperature: [1.6, 1.25, 1.98],
      temperature_by_options: {},
    };

    runtime.initialize(mockSession, tokenizer, config);
    const classifier = new LayaIntentClassifier(runtime);
    const result = await classifier.classify('hello');

    expect(result).not.toBeNull();
    expect(result!.classifiedBy).toBe('laya');
    expect(result!.type).toBeDefined();
    expect(result!.confidence).toBeGreaterThan(0);
    expect(result!.latencyMs).toBeDefined();
  });
});
